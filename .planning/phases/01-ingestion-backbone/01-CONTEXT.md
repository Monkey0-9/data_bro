# Phase 1: Ingestion Backbone - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning
**Mode:** Auto-generated (Infrastructure phase detected)

<domain>
## Phase Boundary

Real-time CME MDP 3.0 market data flowing reliably through Rust decoder → Flink topology → QuestDB. The hot path proves sub-millisecond latency. No analytics yet — pure data infrastructure.

</domain>

<decisions>
## Implementation Decisions

### the agent's Discretion
All implementation choices are at the agent's discretion — this is a pure infrastructure phase focused on performance and reliability.

### Key Technologies (from ROADMAP)
- **Rust**: SBE decoder, sequence gap detection, TCP replay, Aeron IPC.
- **Apache Flink**: Order book state machine, OHLCV windowing, QuestDB sink.
- **QuestDB**: Hot tick storage.
- **Linkerd/Consul**: Service mesh and discovery.
- **Bazel/Buck2**: Monorepo build system.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- None (Project Initialization Phase).

### Established Patterns
- Polyglot monorepo (Bazel/Buck2) requested in ROADMAP.
- High-performance, non-blocking Rust/C++ patterns requested in PROJECT.md.

### Integration Points
- This phase sets the foundation for all future phases.

</code_context>

<specifics>
## Specific Ideas

- Focus on zero-allocation in the Rust decode loop to meet sub-5µs target.
- Use `rtrb` for lock-free SPSC communication between threads.
- Preserve event-time throughout the pipeline for Flink aggregations.

</specifics>

<deferred>
## Deferred Ideas

- RL Signal generation (Phase 3).
- Spatial UI (Phase 4).
- Online learning (Milestone 2).

</deferred>
