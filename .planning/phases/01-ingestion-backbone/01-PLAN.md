# Phase Plan: Ingestion Backbone (01)

The goal of this phase is to establish the high-performance data ingestion pipeline using Rust, Aeron, and Apache Flink.

## 🎯 Objectives
- [ ] Connect Rust `ingest` service to Aeron for low-latency distribution
- [ ] Validate Flink `stream` job consuming from Aeron using zero-copy `DirectBuffer`
- [ ] Ensure tick data reaches QuestDB with < 1ms end-to-end latency
- [ ] Establish initial Prometheus/OpenTelemetry observability for the hot path

## 🛠️ Tasks

### Wave 1: Ingestion Plumbing
- [ ] **Task 1**: Update `ingest/main.rs` to publish Protobuf-encoded `MarketEvent` to Aeron channel
- [ ] **Task 2**: Fix `IngestionJob.java` to correctly deserialize the Protobuf payload (currently has manual byte-offset reading which might mismatch `prost` encoding)
- [ ] **Task 3**: Create `docker-compose.yml` entries for Aeron Media Driver (required for the services to communicate)

### Wave 2: Persistence & Verification
- [ ] **Task 4**: Verify QuestDB table schema matches the ILP fields sent by Flink
- [ ] **Task 5**: Implement a latency-tracking metric that compares `exchange_timestamp` vs `questdb_timestamp`

## 🧪 Verification Plan (UAT)
- [ ] Run `ingest` with 1,000 TPS and verify QuestDB row count increases accordingly
- [ ] Verify `nexus-ui` shows live tick updates coming from the `signal` engine's WebSocket
- [ ] Check Jaeger for distributed traces covering the Ingest -> Flink jump

## 🔗 References
- [market_data.proto](../../../proto/market_data.proto)
- [ingest/main.rs](../../../ingest/src/main.rs)
- [IngestionJob.java](../../../stream/src/main/java/com/nexus/stream/IngestionJob.java)
