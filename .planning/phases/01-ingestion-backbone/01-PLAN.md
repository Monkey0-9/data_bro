# Phase Plan: Ingestion Backbone (01) - Elite Transition

The goal of this phase is to establish the high-performance, institutional-grade data ingestion pipeline using Rust, Aeron, and Apache Flink with SBE/FlatBuffers.

## 🎯 Objectives
- [ ] Implement Rust `ingest` service publishing to Aeron using zero-copy serialization.
- [ ] Connect Apache Flink `stream` job to Aeron using a custom source.
- [ ] Implement Fully Homomorphic Encryption (FHE) hooks for price data.
- [ ] Verify < 1ms P99 latency from ingestion to QuestDB.

## 🛠️ Tasks

### Wave 1: High-Performance Plumbing
- [ ] **Task 1**: Add `aeron-rs` and `flatbuffers` dependencies to `ingest/Cargo.toml`.
- [ ] **Task 2**: Refactor `ingest/src/main.rs` to publish to Aeron channel instead of direct QuestDB ILP.
- [ ] **Task 3**: Update `docker-compose.yml` to include an Aeron Media Driver container.
- [ ] **Task 4**: Implement SBE/FlatBuffers decoding in the Flink `IngestionJob.java`.

### Wave 2: Security & Persistence
- [ ] **Task 5**: Integrate `fhe.rs` into the ingestion hot-path to encrypt sensitive tick data before publishing to the bus.
- [ ] **Task 6**: Ensure QuestDB ILP sink in Flink is optimized for high-throughput (batching).
- [ ] **Task 7**: Implement a latency benchmark script using `hdrhistogram`.

## 🧪 Verification Plan (UAT)
- [ ] Run `ingest` -> Aeron -> Flink -> QuestDB pipeline and verify data integrity.
- [ ] Check QuestDB for encrypted `fhe_state` column.
- [ ] Benchmark 100k msg/sec and verify < 1ms P99 latency.

## 🔗 References
- [PROJECT.md](../../PROJECT.md)
- [ingest/src/main.rs](../../../ingest/src/main.rs)
- [IngestionJob.java](../../../stream/src/main/java/com/nexus/stream/IngestionJob.java)
