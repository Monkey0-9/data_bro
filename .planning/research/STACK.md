# NEXUS — Stack Research

## Executive Summary

The NEXUS stack is intentionally polyglot: C++/Rust for the latency-critical data path, Python for ML velocity, TypeScript + WebGPU for the spatial frontend. Each layer is chosen for its role, not for uniformity.

---

## 1. Stream Processing / Data Ingestion Layer (C++/Rust)

### FIX / CME MDP 3.0 Protocol Parsing

| Library | Lang | Confidence | Notes |
|---------|------|-----------|-------|
| **QuickFIX/N** (custom port) | C++ | High | Battle-tested FIX engine; requires wrapping for CME MDP 3.0 SBE binary |
| **Simple Binary Encoding (SBE)** codec | C++/Rust | High | CME's actual binary market data protocol; `real-logic/simple-binary-encoding` is the reference impl |
| **aeron-rs** | Rust | High | Ultra-low-latency IPC/UDP transport (Aeron); used by Adaptive Financial Consulting in production |
| **quickfix-rs** | Rust | Medium | Community FIX port; not production-hardened for CME MDP 3.0 yet [VERIFY] |

**Recommendation:** Use `real-logic/SBE` C++ codec for CME MDP 3.0 binary decoding. Wrap in a Rust FFI boundary for the ingestion daemon using `cxx` crate.

**What NOT to use:** REST/WebSocket feeds for primary CME data — latency is 10–100x worse than native UDP multicast.

### Apache Flink-Compatible Stream Processing (Rust/C++)

| Option | Confidence | Notes |
|--------|-----------|-------|
| **Apache Flink (JVM) + Rust sidecar** | High | Flink for DAG orchestration; Rust process handles hot path via gRPC/Aeron IPC. Proven pattern at Jane Street, Citadel |
| **RisingWave** | Medium | Rust-native streaming SQL engine; Flink-compatible semantics; actively developed 2025 |
| **Apache Arrow DataFusion** | High | Rust-native query engine on Arrow format; excellent for analytical windows on tick data |
| **Custom Rust streaming DAG** | Medium | Full control but massive build cost; only if team has 3+ senior Rust engineers |

**Recommendation:** **Flink (JVM) for orchestration + Rust ingestion sidecar via Aeron IPC.** Flink handles watermarking, windowing, backpressure. Rust handles sub-microsecond decode. Bridge via shared memory or Aeron.

### Non-Blocking / Wait-Free Concurrent Data Structures

| Library | Lang | Confidence | Pattern |
|---------|------|-----------|---------|
| **Intel TBB (oneTBB)** | C++ | High | concurrent_queue, concurrent_hash_map; industry standard |
| **Folly (Facebook)** | C++ | High | MPMCQueue, ProducerConsumerQueue, hazard pointers |
| **crossbeam** | Rust | High | SegQueue, ArrayQueue, epoch-based memory reclamation |
| **rtrb** | Rust | High | Wait-free SPSC ring buffer; ideal for tick → analytics handoff |
| **libcds** | C++ | Medium | Lock-free data structures library; well-tested |

**Recommendation:** `rtrb` for Rust SPSC hot path; `crossbeam::queue::SegQueue` for MPMC scenarios. Use `folly::ProducerConsumerQueue` for C++ → Rust boundary queues.

**What NOT to use:** `std::sync::Mutex` on the hot path; `Arc<Mutex<T>>` causes microsecond-scale jitter under contention.

### Rust Async Runtime

| Runtime | Confidence | Latency Profile | Notes |
|---------|-----------|----------------|-------|
| **Tokio** | High | P50 excellent, P99.9 variable | Best ecosystem; disable work-stealing for latency-critical threads |
| **monoio** | Medium | Best tail latency | io_uring based; Linux only; production use at ByteDance |
| **glommio** | Medium | Excellent tail latency | Thread-per-core; good for network I/O bound workloads |

**Recommendation:** **Tokio** for general services; **monoio** for the ingestion hot path on Linux production servers. Pin threads to cores with `core_affinity` crate.

---

## 2. AI / Machine Learning Layer (Python)

### Reinforcement Learning Frameworks

| Framework | Confidence | Notes |
|-----------|-----------|-------|
| **RLlib (Ray 2.x)** | High | Best for distributed RL; supports multi-agent, custom environments; production-tested at scale |
| **Stable-Baselines3** | High | Best for research/prototyping; PPO, SAC, TD3 out of box |
| **CleanRL** | High | Single-file implementations; excellent for custom financial RL environments |
| **Gymnasium** | High | Standard environment interface; wrap order book + signals as Gym env |

**Recommendation:** **RLlib + Gymnasium** for production. **Stable-Baselines3** for rapid prototyping. Custom Gymnasium environment wrapping the live tick stream.

**What NOT to use:** Keras-RL (deprecated), OpenAI Baselines (unmaintained).

### Multimodal AI (Price + NLP + Satellite)

| Component | Library | Confidence |
|-----------|---------|-----------|
| **NLP Sentiment** | `transformers` (HuggingFace) + FinBERT / FinGPT | High |
| **Time-series encoder** | `tsai` (fastai), TFT (Temporal Fusion Transformer) | High |
| **Satellite imagery** | `torchvision` + pretrained ResNet/ViT | Medium |
| **Fusion architecture** | Custom PyTorch cross-attention multimodal model | Medium |
| **Inference serving** | **NVIDIA Triton Inference Server** | High |

**Recommendation:** FinBERT for news NLP (financial domain-tuned). Triton for sub-50ms multi-model inference. Cross-attention fusion layer in PyTorch.

### Quantum-Inspired Optimization

| Library | Confidence | Use Case |
|---------|-----------|---------|
| **Qiskit** (IBM) | High | QAOA-inspired portfolio optimization on classical simulator |
| **PennyLane** (Xanadu) | High | Hybrid quantum-classical circuits; auto-diff compatible |
| **D-Wave Ocean SDK** | Medium | Quantum annealing simulation (QUBO formulation for portfolio) |
| **scipy.optimize** | High | Classical fallback; SLSQP, differential evolution |

**Recommendation:** **PennyLane** for quantum-inspired layers in PyTorch models. QAOA-inspired QUBO formulation for portfolio constraint optimization. Classical scipy.optimize as production fallback.

### Genetic Algorithms

| Library | Confidence | Notes |
|---------|-----------|-------|
| **DEAP** | High | Mature, flexible; supports GP, ES, GA |
| **PyGAD** | Medium | Simple API; good for strategy parameter space search |
| **pymoo** | High | Multi-objective optimization; better for portfolio Pareto-front search |

**Recommendation:** **pymoo** for multi-objective strategy evolution (Sharpe vs drawdown Pareto front). **DEAP** for genetic programming of signal expressions.

---

## 3. Database / Encrypted Storage Layer

### Time-Series Tick Database

| DB | Confidence | Notes |
|----|-----------|-------|
| **QuestDB** | High | Best-in-class for high-frequency tick data; SQL interface; 1.6M rows/sec ingestion; column-store |
| **TimescaleDB** | High | PostgreSQL extension; mature; good for analytics on historical data |
| **kdb+/q** | High | Industry gold standard for HFT; expensive licensing; consider for institutional tier |
| **InfluxDB 3.0** | Medium | Good for metrics; less optimal for tick data at full CME depth |

**Recommendation:** **QuestDB** as primary hot tick store. **TimescaleDB** for research/analytics queries on historical data. kdb+ as optional enterprise tier.

### Distributed / Sharded OLTP

| DB | Confidence | Notes |
|----|-----------|-------|
| **CockroachDB** | High | PostgreSQL-compatible; strong consistency; geo-partitioning; active-active multi-region |
| **YugabyteDB** | High | PostgreSQL-compatible; better read latency than CockroachDB for certain patterns |
| **TiDB** | Medium | MySQL-compatible; strong HTAP story with TiFlash |

**Recommendation:** **CockroachDB** for user data, session state, portfolio metadata. Geo-partitioned by region to keep data local.

### Homomorphic Encryption

| Library | Confidence | Use Case |
|---------|-----------|---------|
| **Microsoft SEAL** | High | CKKS scheme for approximate arithmetic; C++ with Python bindings |
| **OpenFHE** | High | Successor to PALISADE; supports BFV, BGV, CKKS; most active 2025 community |
| **CONCRETE-ML (Zama)** | High | sklearn/PyTorch compatible FHE ML inference; best DX for Python ML teams |
| **TF Encrypted** | Low | Largely unmaintained 2025 [VERIFY] |

**Recommendation:** **OpenFHE** (CKKS scheme) for encrypted feature vectors at rest. **CONCRETE-ML** for FHE-compatible model inference. Reserve for batch risk computation, NOT real-time tick path (100x–10000x overhead).

---

## 4. Spatial 3D Frontend

### WebGPU vs WebGL (2026 Reality)

| API | Browser Support (2026) | Performance |
|-----|----------------------|-------------|
| **WebGPU** | Chrome 113+, Firefox 120+, Safari 18+ (~75% global) | 3–5x faster than WebGL for compute shaders |
| **WebGL 2.0** | ~95% global | Mature; good enough for most 3D viz |

**Recommendation:** WebGPU for compute-heavy visualizations (order book depth rendering, correlation spheres). WebGL 2.0 fallback for compatibility. Use feature detection at runtime.

### 3D Visualization Libraries

| Library | Confidence | Best For |
|---------|-----------|---------|
| **Three.js r165+** | High | General 3D scene; massive ecosystem; WebGL/WebGPU backends |
| **Babylon.js 7.x** | High | Better WebGPU integration; physics; good for AR/VR |
| **Deck.gl (CARTO)** | High | Geospatial + data visualization layers; GPU-accelerated |
| **Perspective (FINOS)** | High | Financial data grid/chart; WebAssembly; real-time streaming |
| **Observable Plot** | Medium | 2D statistical charts; not for 3D scenes |

**Recommendation:** **Three.js** for the main 3D scene (order book, correlation sphere, volatility surface). **Perspective** for high-frequency tabular data grids. **Deck.gl** for satellite/geographic overlays.

### WebXR (AR/VR Progressive Enhancement)

| Library | Confidence | Notes |
|---------|-----------|-------|
| **@react-three/fiber + @react-three/xr** | High | React wrapper for Three.js + WebXR; easiest DX |
| **Babylon.js XR** | High | Native WebXR support; better headset controller support |
| **A-Frame** | Low | Too high-level for custom trading UI |

**Recommendation:** **@react-three/fiber + @react-three/xr** for unified React + 3D + WebXR stack.

### Real-Time Data Transport

| Technology | Latency | Notes |
|-----------|---------|-------|
| **WebSocket (native)** | ~1–5ms browser-to-server | Industry standard; supported everywhere |
| **gRPC-Web** | ~2–10ms | Better for structured message types; Protobuf encoding |
| **Server-Sent Events** | ~2–5ms | One-way; good for market data push |

**Recommendation:** **WebSocket + MessagePack** binary encoding for real-time tick streaming. gRPC-Web for RPC calls (portfolio suggestions, order staging). MessagePack is 30–50% smaller than JSON.

### State Management

| Library | Confidence | Notes |
|---------|-----------|-------|
| **Zustand** | High | Minimal; fast; no boilerplate; ideal for high-frequency UI state |
| **Jotai** | High | Atomic state; fine-grained subscriptions prevent re-render storms |
| **Redux Toolkit** | Medium | Overkill for trading UI; too many re-renders on tick data |

**Recommendation:** **Jotai** for fine-grained atom subscriptions on tick data (prevents full-tree re-renders). **Zustand** for app-level state. Never bind raw tick stream directly to React state — use canvas/WebGPU direct rendering for >100 updates/sec.

---

## 5. Infrastructure / Global Mesh

### Message Broker

| Broker | Latency | Confidence | Notes |
|--------|---------|-----------|-------|
| **Aeron** | Sub-microsecond | High | IPC + UDP unicast/multicast; used by LMAX, Adaptive; ideal for intra-process hot path |
| **Chronicle Queue** | Sub-microsecond | High | Memory-mapped; persistent; Java-based but readable from C++ |
| **Apache Pulsar** | ~1ms | High | Better geo-distribution than Kafka; multi-datacenter replication |
| **Apache Kafka** | ~5–10ms | High | Mature; strong ecosystem; use for non-latency-critical analytics events |

**Recommendation:** **Aeron** for intra-node hot path (ingestion → Flink). **Apache Pulsar** for cross-region event streaming and analytics fan-out.

### Service Mesh

| Tool | Confidence | Notes |
|------|-----------|-------|
| **Linkerd 2.x** | High | Lightweight; Rust data plane; lower overhead than Istio |
| **Istio** | Medium | Feature-rich but heavy; suited for large microservice deployments |
| **Consul Connect** | High | Good for service discovery + health checking |

**Recommendation:** **Linkerd** for service-to-service mTLS + observability. **Consul** for service registry and distributed config.

### AI-Powered Adaptive Firewall

| Approach | Confidence | Notes |
|----------|-----------|-------|
| **Cloudflare Workers AI + WAF rules** | High | ML-powered anomaly detection at edge; easy to configure |
| **AWS Shield Advanced + GuardDuty** | High | Managed DDoS protection + ML threat detection |
| **Darktrace API integration** | Medium | Enterprise AI security; expensive; strong for internal network anomaly detection |
| **Custom ML IDS with Suricata** | Low | High build cost; use managed services instead |

**Recommendation:** **Cloudflare WAF + Workers AI** for edge-level adaptive firewall. **AWS GuardDuty** for cloud-level threat detection. Integrate alert streams into the global mesh health monitor.

---

## Version Snapshot (April 2026)

| Component | Version |
|-----------|---------|
| Apache Flink | 1.20.x |
| Rust | 1.77+ (stable) |
| Ray / RLlib | 2.10.x |
| PyTorch | 2.3.x |
| Three.js | r165+ |
| CockroachDB | 24.x |
| QuestDB | 8.x |
| OpenFHE | 1.1.x |
| CONCRETE-ML | 1.5.x |

*[VERIFY] tags indicate items to confirm against current official documentation before implementation.*
