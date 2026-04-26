# NEXUS — Roadmap

**Milestone 1: V1 Thin Slice — CME Futures Intelligence Platform**

Goal: Ship a functional end-to-end trading intelligence platform for CME ES/NQ futures — from raw tick ingestion through RL signal generation to a spatial 3D browser UI — validated by prop desk quant traders.

---

## Phase Overview

| # | Phase | Goal | REQ-IDs | Success Criteria |
|---|-------|------|---------|-----------------|
| 1 | Ingestion Backbone | Real-time CME MDP 3.0 data flowing reliably into QuestDB | INGEST-01 to INGEST-08, INFRA-01 to INFRA-04 | 5 |
| 2 | Storage & Auth Foundation | Persistent data layer + user authentication operational | STORE-01 to STORE-04, AUTH-01 to AUTH-06 | 4 |
| 3 | Signal Engine | RL signal + NLP sentiment + portfolio suggestion generated in real time | SIGNAL-01 to SIGNAL-08 | 5 |
| 4 | Spatial Frontend | 3D spatial browser UI rendering live market data and AI signals | UI-01 to UI-08 | 5 |
| 5 | Integration & Hardening | End-to-end pipeline validated; platform deployed; production-ready | INFRA-05 to INFRA-06 | 4 |

---

## Phase Details

### Phase 1: Ingestion Backbone

**Goal:** Real-time CME MDP 3.0 market data flowing reliably through Rust decoder → Flink topology → QuestDB. The hot path proves sub-millisecond latency. No analytics yet — pure data infrastructure.

**Requirements:** INGEST-01, INGEST-02, INGEST-03, INGEST-04, INGEST-05, INGEST-06, INGEST-07, INGEST-08, INFRA-01, INFRA-02, INFRA-04

**Plans:**
1. Monorepo scaffold (Bazel/Buck2, C++/Rust/Python/TypeScript workspaces, proto contracts, Docker/K8s base)
2. Rust ingestion service (CME MDP 3.0 SBE decoder, sequence gap detection, TCP replay, Aeron IPC publish)
3. Apache Flink topology (order book state machine, OHLCV windowing, event-time watermarking, QuestDB sink)
4. Infrastructure bootstrap (K8s cluster on AWS us-east-1, Linkerd mTLS, Consul service registry, structured logging)
5. Ingestion validation suite (latency benchmarks with hdrhistogram, P99.9 SLO tests, packet-loss simulation, book integrity checks)

**UI hint:** no

**Success Criteria:**
1. ES and NQ Level 2 order book depth (10 levels bid/ask) reconstructs correctly from live CME MDP 3.0 feed with zero corrupt state after 1 hour continuous run
2. End-to-end latency from CME UDP packet → QuestDB write is < 1ms at P99 measured with hdrhistogram under simulated 100k msg/sec load
3. Sequence number gap detector fires and triggers TCP replay channel within 10ms of detecting a gap; order book state remains consistent after recovery
4. OHLCV 1-min bars produced by Flink match reference data from IB TWS to within 0.01 price points (event-time aggregation verified)
5. All services communicate over Linkerd mTLS; Consul health checks confirm all services healthy after 30-minute soak test

---

### Phase 2: Storage & Auth Foundation

**Goal:** Durable, production-grade data storage and user authentication operational. QuestDB tick retention, TimescaleDB OHLCV analytics, CockroachDB user accounts, JWT + TOTP auth flow.

**Requirements:** STORE-01, STORE-02, STORE-03, STORE-04, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06

**Plans:**
1. QuestDB schema and retention policy (tick table schema, symbol + date partitioning, 90-day hot retention, index design)
2. TimescaleDB setup (OHLCV hypertable, continuous aggregates for 5m/1h/1d bars, analytical query patterns)
3. CockroachDB schema (users, sessions, refresh_tokens, portfolio_config tables; bcrypt password hashing; TLS connections)
4. Auth service (JWT issue/refresh/revoke, TOTP enrollment and verification, refresh token rotation, 401 middleware)
5. API Gateway skeleton (WebSocket server, gRPC-Web endpoints, JWT validation middleware, MessagePack encoding)

**UI hint:** no

**Success Criteria:**
1. QuestDB ingests 1M+ tick rows/minute for ES+NQ with query latency < 10ms for last-1-hour tick retrieval
2. TimescaleDB continuous aggregates produce 5-min OHLCV bars that match Flink-computed bars within 0.01 price points
3. User registration, login with TOTP, session refresh, and logout all complete without error; invalid JWT returns 401
4. All database connections verified to use TLS 1.3; password field confirmed bcrypt-hashed in CockroachDB

---

### Phase 3: Signal Engine

**Goal:** RL momentum/regime signal and FinBERT news sentiment score generated in real time on each bar close; portfolio suggestion with pre-trade risk check produced; staged order protobuf available via API.

**Requirements:** SIGNAL-01, SIGNAL-02, SIGNAL-03, SIGNAL-04, SIGNAL-05, SIGNAL-06, SIGNAL-07, SIGNAL-08

**Plans:**
1. RL environment and model (Gymnasium env wrapping 1-min OHLCV + order book snapshot, Stable-Baselines3 PPO pre-training on 2 years historical ES/NQ data, model versioning, Triton serving)
2. NLP sentiment service (news feed RSS/WebSocket ingestion, FinBERT inference via Triton, 15-min EWMA score normalization, ticker entity extraction)
3. Portfolio optimizer (signal aggregation, classical scipy.optimize SLSQP, pre-trade risk checks, staged order protobuf generation)
4. Signal API endpoints (WebSocket topic for real-time signal push, REST endpoint for current signal state, signal history store in TimescaleDB)
5. Signal validation suite (backtest RL model on held-out 6-month period to verify no lookahead bias; sentiment score accuracy spot-check vs labelled news; staged order never triggers external execution)

**UI hint:** no

**Success Criteria:**
1. RL signal (bullish/bearish/neutral) + confidence score generated within 2 seconds of each 1-min bar close for both ES and NQ
2. FinBERT sentiment score for a news article appears in the signal stream within 500ms of article publication time
3. Portfolio suggestion card updates on every signal refresh with a valid direction, size, and pre-trade status (pass/warn/fail)
4. Staged order protobuf is generated and exposed via API; verified that no code path in NEXUS sends this order to any external broker endpoint
5. Backtest on held-out 6-month ES data produces Sharpe > 0.5 with no evidence of lookahead bias (confirmed by feature engineering audit)

---

### Phase 4: Spatial Frontend

**Goal:** Immersive 3D spatial browser UI rendering live ES/NQ market data, RL signals, and sentiment scores. 3D order book + candlestick chart + portfolio suggestion card — at ≥ 30fps on a discrete GPU browser.

**Requirements:** UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08

**Plans:**
1. Three.js scene scaffold (WebGPU renderer with WebGL 2.0 fallback, scene graph, lighting, camera controls, performance baseline)
2. 3D order book component (real-time bid/ask depth bars in 3D, tick-rate WebSocket updates via rAF loop, color coding, depth scale normalization)
3. 3D candlestick chart + signal overlay (OHLCV bar geometry, RL signal color overlay per bar, confidence score indicator, 200-bar scroll window)
4. Sentiment gauge + portfolio suggestion card (FinBERT sentiment radial gauge, portfolio card component with direction/size/risk status, ES/NQ contract switcher)
5. Performance audit and accessibility (60fps GPU / 30fps integrated GPU verification; WebGL fallback test; Jotai atom binding audit confirming no tick-rate React state; browser compatibility matrix)

**UI hint:** yes

**Success Criteria:**
1. 3D order book visualization renders ES Level 2 depth (10 bid + 10 ask levels) updating at tick rate (< 100ms visual latency from Flink event to rendered frame) in Chrome on a discrete GPU machine
2. 3D candlestick chart shows 200 bars of 1-min ES OHLCV history with RL signal color overlay; zoom/pan via mouse/trackpad works smoothly
3. FinBERT sentiment gauge updates within 1 second of a new sentiment score arriving; portfolio suggestion card refreshes on every signal update
4. Frame rate ≥ 30fps sustained over 5-minute live market data session on discrete GPU; graceful degradation to WebGL on unsupported environments confirmed
5. Switching from ES to NQ contract updates all scene elements (order book, chart, signals) within 500ms with no stale data visible

---

### Phase 5: Integration & Production Hardening

**Goal:** Full V1 pipeline validated end-to-end under realistic load. Platform deployed to production AWS environment. Cloudflare WAF active. Observability in place. Platform ready for first quant desk users.

**Requirements:** INFRA-05, INFRA-06 (plus integration of all prior phases)

**Plans:**
1. End-to-end integration tests (full pipeline test: CME feed → Flink → QuestDB → signal services → WebSocket → browser; chaos testing with simulated feed dropout, reconnect, and gap recovery)
2. Production deployment (AWS us-east-1 EKS production cluster, Cloudflare WAF + DDoS protection, TLS termination, domain + SSL setup)
3. Observability stack (structured JSON logging → CloudWatch, distributed tracing with OpenTelemetry, latency dashboards with hdrhistogram P99.9, alerting on SLO breaches)
4. Load testing and soak test (48-hour soak test at simulated peak CME message rate; memory leak detection; GC pause analysis for JVM Flink; verify no latency degradation over 48h)
5. User onboarding flow (account creation → data consent → platform tour → first signal view; doc site with API reference for staged order endpoint)

**UI hint:** no

**Success Criteria:**
1. Full pipeline (CME feed → browser signal display) survives a simulated 30-second feed dropout and recovers with correct order book state within 10 seconds of feed restoration
2. Platform handles 500 concurrent authenticated WebSocket sessions with < 50ms additional signal delivery latency vs single-session baseline
3. 48-hour soak test completes with zero unhandled errors in logs, zero memory leak (RSS growth < 5% over 48h), and P99.9 ingestion latency remaining < 1ms
4. Cloudflare WAF active; all HTTP traffic redirected to HTTPS; all inter-service traffic verified mTLS via Linkerd; no plaintext service communication in production

---

## Milestone Completion Criteria

NEXUS Milestone 1 is complete when:
- All 5 phases are marked complete
- A live demo with real CME data runs for 48 hours without incident
- At least 3 prop desk quant traders have used the platform and provided structured feedback
- All INGEST, SIGNAL, STORE, UI, AUTH, and INFRA requirements are validated (checkboxes ticked in REQUIREMENTS.md)

---

*Roadmap created: 2026-04-26*
*Next milestone (V2): Online RL learning, multi-asset expansion, WebXR, QAOA optimizer, dark pool analytics*
