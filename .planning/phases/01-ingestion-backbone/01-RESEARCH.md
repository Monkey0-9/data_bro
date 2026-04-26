# Phase 1: Ingestion Backbone - Research

## 1. Polyglot Monorepo (Bazel/Buck2)
For a system integrating C++, Rust, Python, and TypeScript, **Bazel** is the most mature choice for cross-language builds, especially with protobuf/gRPC dependencies.
- **Rulesets**: Use `rules_rust`, `rules_python`, `rules_nodejs`, and `rules_java` (for Flink).
- **Protobufs**: Use `rules_proto` to define canonical data contracts (e.g., `MarketEvent`). Bazel can generate language-specific bindings automatically during the build process, ensuring all layers stay in sync.
- **Structure**:
  - `/proto`: Single source of truth for data models.
  - `/ingest`: Rust code for CME decoding.
  - `/stream`: Java/Scala code for Flink topologies.
  - `/signal`: Python code for AI models.
  - `/ui`: TypeScript/React code for the frontend.

## 2. CME MDP 3.0 SBE Decoding in Rust
- **Libraries**: Use a code generator like `sbe-tool` (Java-based, but can output Rust bindings if configured, or use community crates like `sbe-rs`).
- **Zero-Copy**: The critical path must avoid allocations. The Rust decoder should map the incoming UDP packet byte array directly to a struct or read offsets without allocating new memory.
- **UDP Loop**: Use `tokio` with `UdpSocket`, but for the absolute lowest latency, consider bypassing the kernel with `io_uring` (via crates like `monoio` or `tokio-uring`) or using DPDK, though `io_uring` is a good balance of performance and maintainability.

## 3. Aeron IPC (Rust to Flink)
Aeron is the standard for ultra-low latency messaging in trading.
- **Topology**: Rust acts as the Aeron Publisher, Flink acts as the Aeron Subscriber.
- **Transport**: Configure Aeron to use IPC (shared memory) rather than UDP since the Rust sidecar and Flink TaskManager will be co-located on the same K8s node.
- **Integration**:
  - Rust: Use `aeron-rs`.
  - Java (Flink): Use the official `aeron-client`. Flink needs a custom SourceFunction that polls the Aeron subscription.

## 4. Apache Flink + QuestDB
- **State Management**: Order book reconstruction requires maintaining state (bid/ask levels). Use Flink's `ValueState` or `MapState`. To minimize serialization overhead, use efficient serializers (Kryo or custom Protobuf serializers).
- **Event Time**: Assign timestamps and watermarks immediately upon ingestion (using the CME exchange timestamp). This is critical for accurate OHLCV aggregations.
- **QuestDB Sink**: Use the **InfluxDB Line Protocol (ILP)** over TCP for writing to QuestDB. It is highly optimized for high-throughput ingestion. Flink provides an `InfluxDBSink` that can be adapted, or a custom sink using QuestDB's official ILP client can be written.

## 5. Infrastructure (Linkerd/Consul/K8s)
- **Co-location**: Use K8s Pods with multiple containers. The Rust ingestion service and the Flink TaskManager should run in the same Pod to utilize Aeron IPC via shared memory (`emptyDir` volume mounted to `/dev/shm`).
- **Service Mesh**: Linkerd is lightweight and fast, making it suitable for mTLS. However, do NOT route the ultra-low latency Aeron IPC traffic through the Envoy/Linkerd sidecar proxy. The mesh is for gRPC/REST control plane traffic and communication to downstream services (like the Python AI layer or UI).

## Validation Architecture
- **Latency Benchmarking**: Implement trace points at UDP packet receive, Rust Aeron publish, Flink process, and QuestDB write. Use `hdrhistogram` to record latencies and assert that P99.9 < 1ms.
- **Order Book Integrity**: Write a validation script that replays a known PCAP file of CME data and compares the final reconstructed order book state against a known good snapshot.
