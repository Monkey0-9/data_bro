# Phase 1: Ingestion Backbone - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning
**Mode:** Transitioning to Elite Institutional Architecture

<domain>
## Phase Boundary

Real-time CME MDP 3.0 market data flowing reliably through a Rust SBE decoder -> Aeron Cluster -> Apache Flink topology -> QuestDB. The hot path proves sub-millisecond, jitter-free performance using zero-copy and non-blocking/wait-free synchronization.

</domain>

<decisions>
## Implementation Decisions

### Data Path
- **Transport**: Aeron Cluster for distributed, fault-tolerant messaging.
- **Serialization**: Zero-copy Simple Binary Encoding (SBE) or FlatBuffers for sub-microsecond latency.
- **Ingestion**: Kernel-bypass simulation (using `monoio` or similar high-performance async runtimes in Rust).
- **Encryption**: Fully Homomorphic Encryption (FHE) using OpenFHE (CKKS scheme) for price/capital privacy on the stream.

### the agent's Discretion
- Use `aeron-rs` for Aeron integration.
- Implement a Rust-based SBE/FlatBuffers decoder for CME MDP 3.0.
- Update Flink job to consume from Aeron using `AeronSource`.

</decisions>

<code_context>
## Existing Code Insights

- `ingest/src/main.rs`: Currently sends to QuestDB via ILP. Needs to be refactored to publish to Aeron.
- `stream/src/main/java/com/nexus/stream/IngestionJob.java`: Already has a skeleton `AeronSource` but needs to be integrated with real Protobuf/SBE decoding.

</code_context>

<specifics>
## Specific Ideas
- Use a dedicated Aeron Media Driver (containerized).
- Implement a "Prestige" latency-tracking system using hdrhistogram.

</specifics>

<deferred>
## Deferred Ideas
- Hardware-bound Zero-Trust (Milestone 2).
- Multi-Agent RL (Phase 3).
</deferred>
