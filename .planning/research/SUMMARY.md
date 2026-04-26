# NEXUS — Research Summary

## Stack Recommendation

**Polyglot by design — each layer optimized for its role:**

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Ingestion hot path | **Rust (monoio/Tokio) + SBE codec** | Sub-5µs decode, zero heap allocation |
| Stream processing | **Apache Flink 1.20 + Rust sidecar via Aeron** | Flink DAG orchestration + Rust hot path |
| Non-blocking IPC | **Aeron + rtrb (Rust SPSC ring)** | True wait-free SPSC for tick handoff |
| RL / AI layer | **RLlib + Stable-Baselines3 + PyTorch 2.3** | Best ecosystem for financial RL |
| NLP sentiment | **FinBERT + NVIDIA Triton** | Domain-tuned BERT; < 500ms inference |
| Quantum-inspired | **PennyLane + scipy.optimize fallback** | QAOA-inspired portfolio on classical hw |
| Genetic algorithms | **pymoo + DEAP** | Multi-objective strategy Pareto search |
| Tick database | **QuestDB 8.x** | 1.6M rows/sec; purpose-built for tick data |
| Distributed DB | **CockroachDB 24.x (geo-partitioned)** | Active-active multi-region; PG-compatible |
| FHE encryption | **OpenFHE (CKKS) + CONCRETE-ML** | Batch risk computation on encrypted vectors |
| 3D Frontend | **Three.js r165 + WebGPU (WebGL fallback)** | Best 3D ecosystem; WebGPU perf where supported |
| WebXR | **@react-three/xr** | Unified React+Three.js+WebXR |
| State management | **Jotai (atoms) + Zustand** | Fine-grained atom subscriptions prevent re-renders |
| Real-time transport | **WebSocket + MessagePack** | 30–50% smaller than JSON |
| Message broker | **Aeron (intra) + Apache Pulsar (inter-region)** | Sub-µs intra-node; geo-replicated cross-region |
| Service mesh | **Linkerd 2.x + Consul** | Lightweight mTLS + service discovery |
| Adaptive firewall | **Cloudflare WAF + AWS GuardDuty** | ML threat detection at edge + cloud |

## Table Stakes Features (Must Ship)

**V1 non-negotiables:**
1. Real-time CME ES/NQ tick ingestion (MDP 3.0 SBE)
2. Level 2 order book display (10 levels)
3. OHLCV aggregation + candlestick chart (3D spatial)
4. 3D order book visualization (WebGL)
5. RL signal overlay with confidence score
6. FinBERT news sentiment score
7. Portfolio suggestion card + pre-trade risk check
8. User auth (email/password + TOTP)

**V2 expansion:** Full online RL learning, backtesting, dark pool analytics, alerts, role-based access, WebXR AR mode, QAOA-inspired portfolio optimizer, multi-asset class expansion

**V3 advanced:** FHE on feature vectors, satellite imagery multimodal fusion, genetic algorithm live strategy evolution, multi-user AR sessions

## Architecture Build Order

```
Wave 1: Rust ingestion + Flink skeleton + QuestDB
Wave 2: RL signal service + NLP sentiment + portfolio optimizer
Wave 3: API gateway BFF + CockroachDB + auth
Wave 4: Three.js spatial frontend + WebSocket binding
Wave 5: End-to-end integration + single-region deployment
```

## Critical Pitfalls to Avoid

| Priority | Pitfall | Mitigation |
|----------|---------|-----------|
| 🔴 CRITICAL | False latency measurements | hdrhistogram P99.9 SLOs, not mean |
| 🔴 CRITICAL | Heap alloc on hot path | Pre-allocate all buffers; arena alloc |
| 🔴 CRITICAL | SBE sequence gap book corruption | Gap detection + TCP replay from day 1 |
| 🔴 CRITICAL | Backtest lookahead bias | Time-strict train/test splits; WalkForward |
| 🔴 CRITICAL | FHE applied to real-time path | FHE = batch risk only; not tick signal path |
| 🔴 CRITICAL | React re-render storms | Jotai atoms; WebGPU canvas not React state |
| 🔴 CRITICAL | Crossing execution boundary | StagedOrder handoff only; no fill callbacks |
| 🔴 CRITICAL | V1 scope creep (build infra before value) | Ship thin slice in ≤ 8 weeks |
| 🟠 HIGH | CME data licensing costs | Use IB TWS data for V1 bootstrap |
| 🟠 HIGH | Polyglot monorepo complexity | Bazel/Buck2 + proto contracts at every boundary |

## Recommended V1 Delivery Target

**8–12 weeks to functional thin slice:**
- Single region (AWS us-east-1)
- CME ES/NQ futures (via IB TWS data feed as bootstrap, direct CME for production)
- Pre-trained RL model (not yet online-learning)
- Classical scipy portfolio optimizer (quantum-inspired in V2)
- Basic 3D spatial UI in browser (Three.js + WebGL)
- Validated by 3 prop desk quant traders before V2 begins
