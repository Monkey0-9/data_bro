<!-- GSD:project-start source:PROJECT.md -->
## Project

**NEXUS**

NEXUS is a globally distributed, premier trading intelligence platform built exclusively for proprietary trading firms and quantitative research desks. It functions as adaptive, platform-agnostic financial plumbing: ingesting, normalizing, and processing real-time data from dark pools, brokerages, news, satellite, and emerging feeds using a massively parallel stream processing backbone (Apache Flink, C++/Rust, non-blocking/wait-free synchronization), then delivering AI-driven predictive and sentiment signals through an immersive spatial 3D web interface with progressive AR/VR enhancement.

NEXUS is **not** an execution venue. It is the intelligence and signal layer that sits in front of traders' existing execution infrastructure — pure analytics, staging, and signal delivery, with all order execution remaining external to the platform.

**Core Value:** Real-time, AI-enriched market intelligence delivered through a spatial interface that makes the invisible visible — giving quant-driven prop desks an unfair analytical edge over every other tool in their stack.

### Constraints

- **No Execution:** Platform must never route, fill, or take responsibility for orders — pure analytics + staging boundary enforced at architecture level
- **Latency:** Sub-millisecond normalization on the hot data path (C++/Rust layer); the AI/analytics layer operates in the 1–50ms range
- **Regulatory:** No broker-dealer, no registered investment advisor functionality — platform is a data/analytics tool, not a financial services provider
- **Stack:** C++/Rust (ingestion/stream), Python (ML/AI/RL), TypeScript + WebGPU/WebGL (spatial frontend), Apache Flink-compatible stream processing, PostgreSQL-compatible sharded DB with FHE layer
- **Harvest Nexus:** Prior Python risk/backtest components are reused as internal services; not rewritten from scratch
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Executive Summary
## 1. Stream Processing / Data Ingestion Layer (C++/Rust)
### FIX / CME MDP 3.0 Protocol Parsing
| Library | Lang | Confidence | Notes |
|---------|------|-----------|-------|
| **QuickFIX/N** (custom port) | C++ | High | Battle-tested FIX engine; requires wrapping for CME MDP 3.0 SBE binary |
| **Simple Binary Encoding (SBE)** codec | C++/Rust | High | CME's actual binary market data protocol; `real-logic/simple-binary-encoding` is the reference impl |
| **aeron-rs** | Rust | High | Ultra-low-latency IPC/UDP transport (Aeron); used by Adaptive Financial Consulting in production |
| **quickfix-rs** | Rust | Medium | Community FIX port; not production-hardened for CME MDP 3.0 yet [VERIFY] |
### Apache Flink-Compatible Stream Processing (Rust/C++)
| Option | Confidence | Notes |
|--------|-----------|-------|
| **Apache Flink (JVM) + Rust sidecar** | High | Flink for DAG orchestration; Rust process handles hot path via gRPC/Aeron IPC. Proven pattern at Jane Street, Citadel |
| **RisingWave** | Medium | Rust-native streaming SQL engine; Flink-compatible semantics; actively developed 2025 |
| **Apache Arrow DataFusion** | High | Rust-native query engine on Arrow format; excellent for analytical windows on tick data |
| **Custom Rust streaming DAG** | Medium | Full control but massive build cost; only if team has 3+ senior Rust engineers |
### Non-Blocking / Wait-Free Concurrent Data Structures
| Library | Lang | Confidence | Pattern |
|---------|------|-----------|---------|
| **Intel TBB (oneTBB)** | C++ | High | concurrent_queue, concurrent_hash_map; industry standard |
| **Folly (Facebook)** | C++ | High | MPMCQueue, ProducerConsumerQueue, hazard pointers |
| **crossbeam** | Rust | High | SegQueue, ArrayQueue, epoch-based memory reclamation |
| **rtrb** | Rust | High | Wait-free SPSC ring buffer; ideal for tick → analytics handoff |
| **libcds** | C++ | Medium | Lock-free data structures library; well-tested |
### Rust Async Runtime
| Runtime | Confidence | Latency Profile | Notes |
|---------|-----------|----------------|-------|
| **Tokio** | High | P50 excellent, P99.9 variable | Best ecosystem; disable work-stealing for latency-critical threads |
| **monoio** | Medium | Best tail latency | io_uring based; Linux only; production use at ByteDance |
| **glommio** | Medium | Excellent tail latency | Thread-per-core; good for network I/O bound workloads |
## 2. AI / Machine Learning Layer (Python)
### Reinforcement Learning Frameworks
| Framework | Confidence | Notes |
|-----------|-----------|-------|
| **RLlib (Ray 2.x)** | High | Best for distributed RL; supports multi-agent, custom environments; production-tested at scale |
| **Stable-Baselines3** | High | Best for research/prototyping; PPO, SAC, TD3 out of box |
| **CleanRL** | High | Single-file implementations; excellent for custom financial RL environments |
| **Gymnasium** | High | Standard environment interface; wrap order book + signals as Gym env |
### Multimodal AI (Price + NLP + Satellite)
| Component | Library | Confidence |
|-----------|---------|-----------|
| **NLP Sentiment** | `transformers` (HuggingFace) + FinBERT / FinGPT | High |
| **Time-series encoder** | `tsai` (fastai), TFT (Temporal Fusion Transformer) | High |
| **Satellite imagery** | `torchvision` + pretrained ResNet/ViT | Medium |
| **Fusion architecture** | Custom PyTorch cross-attention multimodal model | Medium |
| **Inference serving** | **NVIDIA Triton Inference Server** | High |
### Quantum-Inspired Optimization
| Library | Confidence | Use Case |
|---------|-----------|---------|
| **Qiskit** (IBM) | High | QAOA-inspired portfolio optimization on classical simulator |
| **PennyLane** (Xanadu) | High | Hybrid quantum-classical circuits; auto-diff compatible |
| **D-Wave Ocean SDK** | Medium | Quantum annealing simulation (QUBO formulation for portfolio) |
| **scipy.optimize** | High | Classical fallback; SLSQP, differential evolution |
### Genetic Algorithms
| Library | Confidence | Notes |
|---------|-----------|-------|
| **DEAP** | High | Mature, flexible; supports GP, ES, GA |
| **PyGAD** | Medium | Simple API; good for strategy parameter space search |
| **pymoo** | High | Multi-objective optimization; better for portfolio Pareto-front search |
## 3. Database / Encrypted Storage Layer
### Time-Series Tick Database
| DB | Confidence | Notes |
|----|-----------|-------|
| **QuestDB** | High | Best-in-class for high-frequency tick data; SQL interface; 1.6M rows/sec ingestion; column-store |
| **TimescaleDB** | High | PostgreSQL extension; mature; good for analytics on historical data |
| **kdb+/q** | High | Industry gold standard for HFT; expensive licensing; consider for institutional tier |
| **InfluxDB 3.0** | Medium | Good for metrics; less optimal for tick data at full CME depth |
### Distributed / Sharded OLTP
| DB | Confidence | Notes |
|----|-----------|-------|
| **CockroachDB** | High | PostgreSQL-compatible; strong consistency; geo-partitioning; active-active multi-region |
| **YugabyteDB** | High | PostgreSQL-compatible; better read latency than CockroachDB for certain patterns |
| **TiDB** | Medium | MySQL-compatible; strong HTAP story with TiFlash |
### Homomorphic Encryption
| Library | Confidence | Use Case |
|---------|-----------|---------|
| **Microsoft SEAL** | High | CKKS scheme for approximate arithmetic; C++ with Python bindings |
| **OpenFHE** | High | Successor to PALISADE; supports BFV, BGV, CKKS; most active 2025 community |
| **CONCRETE-ML (Zama)** | High | sklearn/PyTorch compatible FHE ML inference; best DX for Python ML teams |
| **TF Encrypted** | Low | Largely unmaintained 2025 [VERIFY] |
## 4. Spatial 3D Frontend
### WebGPU vs WebGL (2026 Reality)
| API | Browser Support (2026) | Performance |
|-----|----------------------|-------------|
| **WebGPU** | Chrome 113+, Firefox 120+, Safari 18+ (~75% global) | 3–5x faster than WebGL for compute shaders |
| **WebGL 2.0** | ~95% global | Mature; good enough for most 3D viz |
### 3D Visualization Libraries
| Library | Confidence | Best For |
|---------|-----------|---------|
| **Three.js r165+** | High | General 3D scene; massive ecosystem; WebGL/WebGPU backends |
| **Babylon.js 7.x** | High | Better WebGPU integration; physics; good for AR/VR |
| **Deck.gl (CARTO)** | High | Geospatial + data visualization layers; GPU-accelerated |
| **Perspective (FINOS)** | High | Financial data grid/chart; WebAssembly; real-time streaming |
| **Observable Plot** | Medium | 2D statistical charts; not for 3D scenes |
### WebXR (AR/VR Progressive Enhancement)
| Library | Confidence | Notes |
|---------|-----------|-------|
| **@react-three/fiber + @react-three/xr** | High | React wrapper for Three.js + WebXR; easiest DX |
| **Babylon.js XR** | High | Native WebXR support; better headset controller support |
| **A-Frame** | Low | Too high-level for custom trading UI |
### Real-Time Data Transport
| Technology | Latency | Notes |
|-----------|---------|-------|
| **WebSocket (native)** | ~1–5ms browser-to-server | Industry standard; supported everywhere |
| **gRPC-Web** | ~2–10ms | Better for structured message types; Protobuf encoding |
| **Server-Sent Events** | ~2–5ms | One-way; good for market data push |
### State Management
| Library | Confidence | Notes |
|---------|-----------|-------|
| **Zustand** | High | Minimal; fast; no boilerplate; ideal for high-frequency UI state |
| **Jotai** | High | Atomic state; fine-grained subscriptions prevent re-render storms |
| **Redux Toolkit** | Medium | Overkill for trading UI; too many re-renders on tick data |
## 5. Infrastructure / Global Mesh
### Message Broker
| Broker | Latency | Confidence | Notes |
|--------|---------|-----------|-------|
| **Aeron** | Sub-microsecond | High | IPC + UDP unicast/multicast; used by LMAX, Adaptive; ideal for intra-process hot path |
| **Chronicle Queue** | Sub-microsecond | High | Memory-mapped; persistent; Java-based but readable from C++ |
| **Apache Pulsar** | ~1ms | High | Better geo-distribution than Kafka; multi-datacenter replication |
| **Apache Kafka** | ~5–10ms | High | Mature; strong ecosystem; use for non-latency-critical analytics events |
### Service Mesh
| Tool | Confidence | Notes |
|------|-----------|-------|
| **Linkerd 2.x** | High | Lightweight; Rust data plane; lower overhead than Istio |
| **Istio** | Medium | Feature-rich but heavy; suited for large microservice deployments |
| **Consul Connect** | High | Good for service discovery + health checking |
### AI-Powered Adaptive Firewall
| Approach | Confidence | Notes |
|----------|-----------|-------|
| **Cloudflare Workers AI + WAF rules** | High | ML-powered anomaly detection at edge; easy to configure |
| **AWS Shield Advanced + GuardDuty** | High | Managed DDoS protection + ML threat detection |
| **Darktrace API integration** | Medium | Enterprise AI security; expensive; strong for internal network anomaly detection |
| **Custom ML IDS with Suricata** | Low | High build cost; use managed services instead |
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
