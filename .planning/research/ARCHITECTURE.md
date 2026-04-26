# NEXUS — Architecture Research

## System Layers (Top to Bottom)

```
┌─────────────────────────────────────────────────────────┐
│              SPATIAL 3D WEB FRONTEND                     │
│     Three.js / WebGPU  ·  WebXR  ·  React + Jotai       │
├─────────────────────────────────────────────────────────┤
│              API GATEWAY / BFF                           │
│     WebSocket server  ·  gRPC-Web  ·  REST (auth)        │
├─────────────────────────────────────────────────────────┤
│              ANALYTICS & SIGNAL LAYER (Python)           │
│  RLlib RL models  ·  FinBERT NLP  ·  Portfolio optimizer │
│  PennyLane quantum-inspired  ·  DEAP genetic algorithms  │
├─────────────────────────────────────────────────────────┤
│              STREAM PROCESSING (Flink + Rust)            │
│  Flink DAG orchestrator  ·  Rust hot path decoder        │
│  Order book state machine  ·  Aggregation windows        │
├─────────────────────────────────────────────────────────┤
│              DATA INGESTION / TRANSPORT                  │
│  Aeron UDP multicast  ·  CME MDP 3.0 SBE decoder         │
│  FIX protocol parser  ·  Alternative data adapters       │
├─────────────────────────────────────────────────────────┤
│              STORAGE LAYER                               │
│  QuestDB (hot ticks)  ·  TimescaleDB (analytics)         │
│  CockroachDB (user/portfolio metadata, geo-distributed)  │
│  OpenFHE CKKS encryption on feature vectors              │
├─────────────────────────────────────────────────────────┤
│              GLOBAL MESH / INFRA                         │
│  Linkerd mTLS  ·  Consul service registry                │
│  Apache Pulsar (cross-region events)  ·  Cloudflare WAF  │
└─────────────────────────────────────────────────────────┘
```

## Data Flow — V1 Thin Slice

```
CME Globex UDP Multicast (MDP 3.0 SBE)
    │
    ▼
[Rust SBE Decoder] — rtrb SPSC ring buffer → [Flink Ingestion Topology]
    │                                              │
    │                                    [Order Book State Machine]
    │                                              │
    │                                    [OHLCV Aggregation Window]
    │                                              │
    ├──────── raw ticks ──────────────→ [QuestDB hot store]
    │                                              │
    │                              ┌───────────────┴────────────────┐
    │                              ▼                                ▼
    │               [Python RL Signal Service]          [NLP Sentiment Service]
    │                (Stable-Baselines3 PPO)            (FinBERT via Triton)
    │                              │                                │
    │                              └───────────┬────────────────────┘
    │                                          ▼
    │                             [Portfolio Optimizer]
    │                             (scipy + classical QA)
    │                                          │
    └──────────────────────────────────────────▼
                          [WebSocket BFF / API Gateway]
                                          │
                                          ▼
                          [Three.js Spatial Frontend]
                          3D order book + chart + signals
```

## Component Boundaries

### Ingestion Service (Rust)
- **Owns:** CME MDP 3.0 UDP receive loop, SBE decode, FIX session management
- **Outputs:** Normalized `MarketEvent` protobuf messages on Aeron IPC channel
- **Does NOT:** Do any analytics, aggregation, or storage directly
- **Latency target:** < 5 microseconds from packet receipt to Aeron publish

### Flink Stream Processor (Java + Rust sidecar)
- **Owns:** Event routing DAG, order book reconstruction, OHLCV windowing, watermarking
- **Inputs:** Aeron IPC from Ingestion Service
- **Outputs:** Enriched events to QuestDB (raw ticks), analytics event bus (Pulsar), WebSocket BFF
- **Latency target:** < 1ms end-to-end for order book updates

### RL Signal Service (Python / RLlib)
- **Owns:** Market environment wrapper, model serving (Triton), online learning loop
- **Inputs:** 1-min OHLCV + order book snapshots from Flink (via Pulsar topic)
- **Outputs:** Signal type (momentum/mean-rev/regime), confidence score, suggested direction
- **Update frequency:** Signal refresh every 1-min bar close; model checkpoint every 4h

### NLP Sentiment Service (Python / Triton + FinBERT)
- **Owns:** News feed ingestion (RSS/WebSocket), FinBERT inference, score normalization
- **Inputs:** Raw news articles (Reuters, Bloomberg news webhook), social feeds
- **Outputs:** Entity-tagged sentiment scores (ticker → score, -1 to +1, rolling 15-min EWMA)
- **Latency target:** < 500ms from article publication to scored output

### Portfolio Optimizer (Python)
- **Owns:** Signal aggregation, constraint enforcement, weight calculation, pre-trade risk checks
- **Inputs:** RL signal, sentiment score, current positions, VaR limits
- **Outputs:** Suggested portfolio weights, staged order object (for external execution)
- **Latency target:** < 100ms for suggestion refresh

### API Gateway / BFF (TypeScript / Node.js)
- **Owns:** WebSocket multiplexing to browser, gRPC-Web endpoints, JWT auth validation
- **Inputs:** Flink output events (Pulsar), RL signal service, portfolio optimizer
- **Outputs:** Binary MessagePack WebSocket stream to browser clients
- **Latency target:** < 10ms from Flink event to browser frame

### Spatial Frontend (TypeScript / React / Three.js)
- **Owns:** 3D scene rendering, WebSocket data binding, WebXR session management
- **Inputs:** WebSocket stream from BFF
- **Does NOT:** Do any analytics — pure visualization + UX
- **Render target:** 60fps on discrete GPU, 30fps on integrated GPU

## Suggested Build Order (V1 Critical Path)

```
Wave 1 (Foundation — must come first):
├── Ingestion Service (Rust SBE decoder + Aeron)
└── Flink topology skeleton (receive → order book → QuestDB)

Wave 2 (Analytics core — after Wave 1):
├── RL Signal Service (pre-trained model, no online learning yet)
├── NLP Sentiment Service (FinBERT + Triton)
└── QuestDB schema + TimescaleDB historical store

Wave 3 (Delivery layer — after Wave 2):
├── API Gateway / BFF (WebSocket + auth)
├── Portfolio Optimizer (classical scipy)
└── CockroachDB (user accounts, sessions)

Wave 4 (Frontend — can start after Wave 3 API contract defined):
├── Three.js spatial scene scaffold (3D order book)
├── React shell + Jotai state management
└── WebSocket data binding + candlestick chart

Wave 5 (Integration + V1 slice complete):
├── End-to-end integration tests
├── Deploy on single-region cloud (AWS us-east-1)
└── V1 demo: live ES/NQ data → RL signal → 3D UI
```

## Latency Budget (V1)

| Hop | Target Latency |
|-----|---------------|
| CME UDP → Rust SBE decode | < 5 µs |
| Rust → Aeron IPC → Flink | < 100 µs |
| Flink order book update | < 500 µs |
| Flink → QuestDB write | < 1 ms |
| Flink → BFF WebSocket publish | < 5 ms |
| BFF → Browser WebSocket frame | < 10 ms |
| RL signal refresh (per bar) | < 100 ms |
| NLP sentiment score | < 500 ms |
| **Total: CME tick → browser pixel** | **~15–50 ms** |

## Geographic Distribution (V2+)

```
Primary PoP: AWS us-east-1 (co-located with CME Chicago via cross-connect)
Secondary PoP: AWS eu-west-1 (EUREX, Euronext feeds)
Tertiary PoP: AWS ap-northeast-1 (Osaka — TSE feeds)

CockroachDB: 3-region active-active (us-east-1, eu-west-1, ap-northeast-1)
QuestDB: Primary in us-east-1; read replicas in eu/ap
Pulsar: Geo-replication across all 3 regions
```

## AI Adaptive Firewall Architecture

```
[Cloudflare WAF + Workers AI] ← edge layer, ML threat classification
        │
        ▼
[API Gateway] ← rate limiting, JWT validation, behavioral fingerprinting
        │
        ▼
[GuardDuty + Mesh telemetry] ← cloud-level anomaly detection
        │
        ▼
[Linkerd mTLS] ← service-to-service encrypted; cert rotation
        │
[Alert → Global Mesh Health Monitor] → auto-reroute on threat detection
```
