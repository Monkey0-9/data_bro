# NEXUS — v1 Requirements

## v1 Requirements

### INGEST — Data Ingestion & Stream Processing

- [ ] **INGEST-01**: System ingests real-time CME Globex MDP 3.0 SBE UDP multicast for ES (E-Mini S&P 500) and NQ (Nasdaq-100) futures contracts
- [ ] **INGEST-02**: Rust SBE decoder processes raw market data packets with < 5 microsecond decode latency on the hot path, using pre-allocated buffers with no heap allocation
- [ ] **INGEST-03**: System detects and handles CME sequence number gaps via TCP replay channel, preventing silent order book corruption
- [ ] **INGEST-04**: Apache Flink topology reconstructs Level 2 order book state (10 bid/ask price levels + quantities) from tick stream in real time
- [ ] **INGEST-05**: Flink topology aggregates ticks into OHLCV bars at 1-second, 1-minute, and 5-minute intervals using event time (CME timestamps, not processing time)
- [ ] **INGEST-06**: All normalized tick events and OHLCV bars are persisted to QuestDB with symbol, exchange timestamp, and ingestion timestamp fields
- [ ] **INGEST-07**: Latency from CME UDP packet receipt to QuestDB write is < 1 millisecond at P99 under normal market conditions
- [ ] **INGEST-08**: System handles FIX session-level events (logon, logout, heartbeat, test request) without interrupting the market data stream

### SIGNAL — AI Signal Generation

- [ ] **SIGNAL-01**: Python RL signal service generates a momentum/regime signal (bullish / bearish / neutral) on each completed 1-minute bar close for ES and NQ
- [ ] **SIGNAL-02**: RL signal is accompanied by a confidence score (0.0–1.0) based on the model's output probability distribution
- [ ] **SIGNAL-03**: NLP sentiment service ingests news articles from at least one financial news RSS/WebSocket feed and scores sentiment per ticker using FinBERT within 500ms of article publication
- [ ] **SIGNAL-04**: Sentiment score is a normalized value (-1.0 to +1.0) representing aggregate sentiment with a 15-minute exponential weighted moving average
- [ ] **SIGNAL-05**: Portfolio optimizer combines RL signal + sentiment score to generate a dynamic portfolio suggestion (suggested position direction and size as % of notional)
- [ ] **SIGNAL-06**: Portfolio suggestion includes a pre-trade risk check: position size within configured limits, estimated slippage flag if order size exceeds 0.5% of 5-min avg volume
- [ ] **SIGNAL-07**: A staged order object (protobuf) is generated from the portfolio suggestion and made available via API — NEXUS never routes, fills, or tracks this order further
- [ ] **SIGNAL-08**: RL model is a pre-trained Stable-Baselines3 PPO model (not yet online-learning in V1); model artifact is versioned and loaded at service startup

### STORE — Data Storage

- [ ] **STORE-01**: QuestDB stores all raw tick events partitioned by symbol and trading date; retention policy configurable (default: 90 days hot)
- [ ] **STORE-02**: TimescaleDB stores OHLCV bars for historical analytics queries with PostgreSQL-compatible SQL interface
- [ ] **STORE-03**: CockroachDB stores user accounts, sessions, role assignments, and portfolio configuration with strong consistency
- [ ] **STORE-04**: All database connections use TLS 1.3 in transit; data at rest uses AES-256 encryption on disk

### UI — Spatial 3D Frontend

- [ ] **UI-01**: User can view a real-time 3D order book visualization for ES and NQ in a browser (Three.js WebGL); bid levels rendered as one color, ask levels as another; depth represented as bar height in 3D space; updates at tick rate (< 100ms visual latency)
- [ ] **UI-02**: User can view a 3D candlestick chart of 1-minute OHLCV bars for ES and NQ with at least 200 bars of history visible; chart supports zoom and pan via mouse/trackpad
- [ ] **UI-03**: User can see the current RL signal (bullish/bearish/neutral) and confidence score overlaid on the candlestick chart as a colored indicator per bar
- [ ] **UI-04**: User can see the current FinBERT news sentiment score (-1 to +1) displayed as a numeric gauge and color-coded overlay on the chart
- [ ] **UI-05**: User can view a portfolio suggestion card showing: suggested direction (long/short/flat), suggested notional size, signal confidence, sentiment score, and pre-trade risk status (pass/warn/fail)
- [ ] **UI-06**: The 3D scene renders at ≥ 30 frames per second on a modern browser with a discrete GPU; degrades gracefully to WebGL 1.0 on unsupported environments
- [ ] **UI-07**: Tick data updates to the 3D scene are driven from a requestAnimationFrame loop and Jotai atoms — NOT React state — to prevent re-render storms
- [ ] **UI-08**: User can switch between ES and NQ contracts via a dropdown; scene updates to display the selected contract's data within 500ms

### AUTH — Authentication & Access

- [ ] **AUTH-01**: User can create an account with email address and password (minimum 12 characters, bcrypt hashed)
- [ ] **AUTH-02**: User can log in with email/password and receives a JWT access token (15-minute expiry) and refresh token (7-day expiry)
- [ ] **AUTH-03**: User can enable TOTP two-factor authentication (Google Authenticator compatible); TOTP required at login if enabled
- [ ] **AUTH-04**: User can log out, which invalidates the current refresh token
- [ ] **AUTH-05**: Expired or invalid JWT results in 401 response and redirect to login; refresh token is used silently to obtain new access token while valid
- [ ] **AUTH-06**: All API endpoints require a valid JWT; unauthenticated requests return 401

### INFRA — Infrastructure & Reliability

- [ ] **INFRA-01**: All service-to-service communication uses mTLS via Linkerd 2.x service mesh
- [ ] **INFRA-02**: Services are registered in Consul for discovery; health checks run every 10 seconds
- [ ] **INFRA-03**: WebSocket BFF serves real-time market data and signals to browser clients using binary MessagePack encoding
- [ ] **INFRA-04**: System is deployed on a single AWS region (us-east-1) in V1; all services containerized with Docker and orchestrated via Kubernetes
- [ ] **INFRA-05**: Cloudflare WAF is configured as the edge layer for the web frontend with DDoS protection and bot mitigation rules active
- [ ] **INFRA-06**: All service logs are structured JSON, collected centrally (CloudWatch or equivalent), and include trace IDs for request correlation

---

## v2 Requirements (Deferred)

- **INGEST:** Multi-feed redundancy, dark pool feed integration, additional asset class (equity options, interest rate futures), news feed WebSocket ingestion at scale
- **SIGNAL:** Online RL learning (model updates on live data); multi-model ensemble; QAOA-inspired portfolio optimizer; volatility regime ensemble model; dark pool liquidity signal
- **STORE:** Geographic distribution (3-region CockroachDB); geo-partitioned QuestDB read replicas; 1-year hot tick retention
- **UI:** Correlation sphere visualization; spatial heatmap; WebXR mode (Apple Vision Pro, Meta Quest); alert system (threshold + ML anomaly); portfolio P&L dashboard; backtesting UI
- **INFRA:** AI adaptive firewall (ML anomaly detection on network traffic); global mesh with cross-region Pulsar; HomomorphicEncryption of feature vectors (OpenFHE CKKS); HSM key management

## v3 Requirements (Advanced)

- FHE-compatible risk model (CONCRETE-ML batch risk on encrypted portfolio)
- Satellite imagery analytics (torchvision + alt data)
- Multimodal signal fusion (price + NLP + satellite cross-attention)
- Genetic algorithm live strategy evolution (pymoo + DEAP in production)
- Multi-user shared AR session for collaborative analysis
- Gesture and voice manipulation of spatial data objects
- SSO (SAML/OIDC for enterprise identity providers)

---

## Out of Scope

- **Internal order execution / matching engine** — Broker-dealer regulatory burden; execution stays external
- **Compliance reporting (MiFID II reports, SEC 13F)** — Institutional PM feature; deferred beyond V3
- **Retail consumer UI** — Dilutes prop/quant desk focus
- **Crypto as V1 asset class** — Institutional credibility risk; add in V2 after core validated
- **Robo-advisor / investment advice functionality** — RIA registration required
- **Bloomberg / Refinitiv data redistribution** — Licensing prohibits it
- **Fill confirmation tracking / order lifecycle management** — Crosses execution boundary

---

## Traceability

| REQ-ID | Phase |
|--------|-------|
| INGEST-01 to INGEST-08 | Phase 1 |
| SIGNAL-01 to SIGNAL-08 | Phase 3 |
| STORE-01 to STORE-04 | Phase 2 |
| UI-01 to UI-08 | Phase 4 |
| AUTH-01 to AUTH-06 | Phase 2 |
| INFRA-01 to INFRA-06 | Phase 1, 5 |
