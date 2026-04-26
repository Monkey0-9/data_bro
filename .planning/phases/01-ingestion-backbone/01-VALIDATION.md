# Phase 1: Ingestion Backbone - Validation Strategy

**Status:** Draft
**Phase:** 1
**Date:** 2026-04-26

## 1. Goal Backward Validation
- [ ] Verify CME MDP 3.0 packets can be received and decoded.
- [ ] Verify Rust sidecar communicates with Flink via Aeron IPC.
- [ ] Verify Flink reconstructs the Level 2 order book.
- [ ] Verify Flink aggregates tick data into OHLCV bars correctly.
- [ ] Verify QuestDB ingests tick and OHLCV data from Flink.

## 2. Boundary Integrity Validation
- [ ] Network: Verify UDP multicast reception is robust under load.
- [ ] Interface: Verify Protobuf contracts match between Rust and Java.
- [ ] Security: Verify Linkerd mTLS is active between services (excluding Aeron IPC).

## 3. Dimension 8: Non-Functional Validation
- [ ] **Performance**: End-to-end latency from UDP packet to QuestDB write MUST be < 1ms at P99.
- [ ] **Reliability**: Sequence number gap detection must trigger TCP replay and recover state within 10ms.
- [ ] **Throughput**: System must handle 100,000 messages per second without dropping packets or increasing latency beyond 1ms.
