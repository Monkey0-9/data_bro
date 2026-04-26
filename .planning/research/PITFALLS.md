# NEXUS — Pitfalls Research

## Critical Pitfalls by Layer

---

### 1. Stream Processing / Low-Latency Pitfalls

#### P1.1 — False Latency Measurements [CRITICAL]
**What:** Teams measure average latency and declare victory. P99.9 tail latency (the worst 1-in-1000 event) is what kills trading systems — a 10ms spike during a regime change is exactly when low latency matters most.
**Warning signs:** Benchmarks show "sub-millisecond" but only report mean/median; no percentile histograms published.
**Prevention:** Use `hdrhistogram` (Rust) or `HdrHistogram` (Java/C++) for all latency measurements. Report P50, P95, P99, P99.9, P99.99. Mandate latency SLO = P99.9 < 1ms for order book updates.
**Phase:** Address in Phase 1 (ingestion) infrastructure.

#### P1.2 — Memory Allocation on the Hot Path [CRITICAL]
**What:** Any `malloc`/`new` in C++ or `Box::new`/`Vec::new` in Rust on the critical path causes microsecond-scale jitter from the allocator. In trading systems, this shows up as latency spikes during high-message-rate periods.
**Warning signs:** Latency suddenly spikes 10–100x when message rate increases.
**Prevention:** Pre-allocate all buffers at startup. Use arena allocators (jemalloc, mimalloc). In Rust, use pre-allocated ring buffers (`rtrb`) and avoid any heap allocation in the hot decode loop.
**Phase:** Phase 1 — must be designed in from day one.

#### P1.3 — CAS Loop Spinlocks Disguised as "Lock-Free" [HIGH]
**What:** A compare-and-swap loop that retries indefinitely under contention IS a spinlock, and it burns CPU while blocking progress. Marketed as "wait-free" but is actually lock-free at best, and only wait-free if bounded retries are guaranteed.
**Warning signs:** CPU core pegged at 100% during high message rate; "lock-free queue" shows high contention in profiler.
**Prevention:** Use true wait-free algorithms where possible (`rtrb` SPSC for single-producer scenarios). Measure actual contention with `perf stat`. Design topology to avoid MPSC on the hot path — prefer fan-out from a single ingestion thread.
**Phase:** Phase 1 design review.

#### P1.4 — FIX/SBE Sequence Number Gaps [HIGH]
**What:** CME MDP 3.0 sends UDP multicast. Packet loss is real. If the decoder misses a sequence number and doesn't handle the gap correctly, the order book state corrupts silently — the worst failure mode in trading systems (you don't know you're wrong until a loss occurs).
**Warning signs:** Order book mid-price drifting away from consolidated tape; sporadic "impossible" prices.
**Prevention:** Implement sequence number gap detection + retransmission request (TCP replay channel) from day one. Never assume UDP delivery. Test with simulated packet loss. Add book integrity checks (bid < ask, spreads within bounds).
**Phase:** Phase 1 — non-negotiable before any live data.

#### P1.5 — Event Time vs Processing Time Confusion [HIGH]
**What:** Flink differentiates event time (when the trade actually occurred) and processing time (when Flink received it). Using processing time for financial aggregations introduces non-determinism — the same market data produces different bars depending on system load.
**Warning signs:** Backtests don't reproduce live trading results; bars at EOD have slightly different OHLCV values.
**Prevention:** Always use event time in Flink with proper watermarking. Ensure CME timestamps are preserved through the SBE decode → Flink pipeline. Test with delayed/out-of-order events.
**Phase:** Phase 1 Flink topology.

---

### 2. AI/ML Pitfalls

#### P2.1 — Backtest Overfitting / Lookahead Bias [CRITICAL]
**What:** RL models trained on historical data with even a millisecond of future information produce spectacular backtest results and catastrophic live results. Extremely common when using pandas with `shift()` incorrectly, or when normalizing features using statistics computed over the full dataset including future data.
**Warning signs:** Backtest Sharpe > 3; live Sharpe < 0.5 immediately.
**Prevention:** Strict train/validation/test split by time. All feature normalization statistics must be computed only from data available at prediction time (rolling lookback, not full-dataset stats). Use WalkForward validation. Code review specifically checking for data leakage.
**Phase:** Phase 2 (backtesting) — but discipline must start in Phase 1 feature engineering.

#### P2.2 — Online Learning Model Degradation [CRITICAL]
**What:** "Perpetually learning" RL models that retrain on every new tick can catastrophically degrade when the market enters an adversarial regime (flash crash, stop-hunt, news shock). The model overfits to the last N ticks and unlearns everything else.
**Warning signs:** Signal performance degrades sharply after a high-volatility event; model recommends increasingly extreme positions.
**Prevention:** Shadow mode testing — new model versions run in parallel without affecting signals until validated. Minimum performance thresholds (Sharpe, win rate) before a model version is promoted to production. Replay buffer with stratified sampling across regimes. Hard position limits independent of model.
**Phase:** Phase 2 (online learning implementation).

#### P2.3 — "Quantum" Washing [HIGH]
**What:** Calling scipy.optimize or a simple genetic algorithm "quantum-inspired" without it actually using quantum algorithmic principles. This erodes credibility with sophisticated quant users.
**Warning signs:** "Quantum optimization" that runs in milliseconds on a laptop and produces identical results to classical optimization.
**Prevention:** Be precise in terminology. QAOA-inspired = using QAOA's alternating operator ansatz structure classically simulated. Quantum annealing simulation = QUBO formulation with simulated annealing. Always compare against classical baseline. Document what "quantum-inspired" actually means in the codebase.
**Phase:** Phase 3 (quantum-inspired feature implementation).

#### P2.4 — Reward Function Design Failures [HIGH]
**What:** RL reward functions that maximize raw PnL produce agents that take maximum leverage and blow up. Reward functions that maximize Sharpe ratio produce agents that refuse to trade during regime changes. Both are wrong.
**Warning signs:** Agent always goes max long or max short; agent never generates signals; agent signals degrade in live market.
**Prevention:** Multi-objective reward: risk-adjusted return (Calmar ratio or modified Sharpe) + position size penalty + drawdown penalty. Clip rewards to prevent extreme gradient updates. Test reward function in simulation against known market regimes.
**Phase:** Phase 2 (RL environment design).

---

### 3. Homomorphic Encryption Pitfalls

#### P3.1 — FHE Performance Reality [CRITICAL]
**What:** Fully Homomorphic Encryption (FHE) is 100x–10,000x slower than plaintext computation. Running a neural network inference under CKKS encryption on current hardware (2026) takes seconds to minutes per inference, not milliseconds. Real-time tick-by-tick FHE inference is not feasible today.
**Warning signs:** FHE ML inference demo runs in 30 seconds for a 3-layer network; being marketed as "real-time."
**Prevention:** FHE is scoped ONLY to batch risk computations and feature vector storage at rest — NOT the real-time signal path. The signal path runs on plaintext. Use CONCRETE-ML's FHE compilation for batch risk model only. Be explicit with users about what is FHE-protected vs plaintext.
**Phase:** Phase 3 (FHE implementation) — scope strictly limited.

#### P3.2 — CKKS Noise Accumulation [HIGH]
**What:** CKKS (the FHE scheme for approximate arithmetic) accumulates noise with each operation. Deep computations lose precision. A neural network with many layers will produce results with significant approximation error.
**Warning signs:** FHE model outputs differ significantly from plaintext model outputs; variance in results increases with model depth.
**Prevention:** Limit FHE-computed models to shallow networks (< 5 layers). Use CONCRETE-ML's noise analysis tools to validate precision before deployment. Keep plaintext shadow model for accuracy comparison.
**Phase:** Phase 3.

---

### 4. Database / Distribution Pitfalls

#### P4.1 — Hot Spot Partitioning [CRITICAL]
**What:** If QuestDB and CockroachDB are partitioned by timestamp, all live queries hit the same partition shard — the one containing "now." This creates a hot spot that degrades with traffic.
**Warning signs:** One database node pegged at 100% CPU/IO while others are idle; query latency spikes during peak trading hours.
**Prevention:** Partition tick data by symbol + time bucketing, not time alone. Use CockroachDB geo-partitioning by user region, not by timestamp. Ensure read replicas are used for analytics queries.
**Phase:** Phase 1 (schema design).

#### P4.2 — Cross-Region Consistency vs Latency [HIGH]
**What:** CockroachDB strong consistency (serializable isolation) across 3 geographic regions requires cross-region consensus, adding 50–150ms round-trip latency. For user-facing writes this is often acceptable; for trading signals it is not.
**Warning signs:** Signal generation latency suddenly jumps when database quorum is required for a write.
**Prevention:** Use stale reads (CockroachDB AS OF SYSTEM TIME) for analytics queries — these are served from local replicas with no cross-region round trip. Only writes to user account / order staging data require strong consistency.
**Phase:** Phase 2 (geo-distribution).

---

### 5. Frontend / Spatial UI Pitfalls

#### P5.1 — React Re-Render Storms from Tick Data [CRITICAL]
**What:** Binding raw tick data (100+ updates/second) directly to React state causes continuous full-component-tree re-renders, making the browser freeze. This is a common mistake when developers use `useState` or Redux for high-frequency market data.
**Warning signs:** Browser frame rate drops below 30fps during active trading; CPU fan spins up when viewing live data.
**Prevention:** NEVER put tick-rate data in React state. Use Jotai atoms with fine-grained subscriptions. Render the 3D order book directly in Three.js/WebGPU without React re-renders — use a ref to the canvas and drive updates from a requestAnimationFrame loop. React is only for UI chrome (buttons, modals, panels), not the data visualization.
**Phase:** Phase 4 (frontend architecture).

#### P5.2 — WebGPU Compatibility Gap [HIGH]
**What:** WebGPU browser support is ~75% globally as of 2026 but varies significantly by geography and enterprise browser policy. Corporate trading environments often have IT-mandated older Chrome/Edge versions that don't support WebGPU.
**Warning signs:** Platform works in developer's browser but fails for 30% of enterprise users.
**Prevention:** Always implement WebGL 2.0 fallback at feature detection time. Graceful degradation: WebGPU → WebGL 2.0 → WebGL 1.0 → 2D canvas. Test on the minimum supported Chrome/Edge version in target enterprise environments.
**Phase:** Phase 4 (frontend) — design the fallback chain from day one.

---

### 6. Regulatory / Compliance Pitfalls

#### P6.1 — Accidentally Crossing Execution Boundary [CRITICAL]
**What:** If NEXUS manages order lifecycle (tracks fill confirmations, updates P&L from fills, handles partial fills), it may qualify as an OMS (order management system) subject to broker-dealer regulations even without a matching engine.
**Warning signs:** Feature creep: "just add a fill confirmation callback"; "just track the order state machine."
**Prevention:** Hard architectural boundary: NEXUS outputs a `StagedOrder` protobuf object. That object is handed to the user's broker API. NEXUS never receives fill callbacks. Never track "in-flight" order state. This is a design constraint enforced at the API gateway level.
**Phase:** Phase 1 — enforce from the very first API design.

#### P6.2 — CME Data Feed Licensing Cost [HIGH]
**What:** CME real-time market data (MDP 3.0) requires a licensing agreement. Costs for non-display (algorithmic use) can run $1,000–$50,000/month depending on usage tier. Many projects underestimate this.
**Warning signs:** Project plans assume free CME data; CME Globex API access assumed to be public.
**Prevention:** Use CME's free Globex test/certification environment for development. Budget for real CME data licensing before any live trading demo. Consider using broker-provided market data (Interactive Brokers TWS has CME data with brokerage account) as a lower-cost bootstrap for V1.
**Phase:** Phase 1 (infrastructure planning).

---

### 7. Project Execution Pitfalls

#### P7.1 — Building Architecture Before Validating Core Value [CRITICAL]
**What:** Building the full global mesh, FHE layer, WebXR, and genetic algorithms before validating that the core signal (RL + 3D UI) is actually useful to prop desk traders. Classic "build it and they will come" failure.
**Warning signs:** 6+ months of infrastructure work with no trader feedback; no V1 thin slice shipped.
**Prevention:** V1 thin slice first: one asset class, one broker feed, one RL model, basic 3D UI. Get it in front of at least 3 prop desk quant traders within 8 weeks. Iterate on feedback before building V2 infrastructure.
**Phase:** This is why V1 is defined as a thin slice — enforce it.

#### P7.2 — Polyglot Monorepo Complexity [HIGH]
**What:** C++/Rust/Python/TypeScript in a single monorepo creates complex build tooling, dependency conflicts, and slow CI pipelines. Teams underestimate this.
**Warning signs:** CI takes > 20 minutes; developers avoid changing cross-language boundaries; "works on my machine" for non-trivial dependency.
**Prevention:** Use Bazel or Buck2 for polyglot monorepo builds. Define clear protobuf/Flatbuffers contracts at every language boundary. Each language layer is independently deployable and testable. Integration tests only run on the full stack, not unit tests.
**Phase:** Phase 1 (repo setup).

## Severity Summary

| ID | Description | Severity | Phase |
|----|-------------|---------|-------|
| P1.1 | False latency measurements | CRITICAL | 1 |
| P1.2 | Memory allocation on hot path | CRITICAL | 1 |
| P1.4 | SBE sequence number gap corruption | CRITICAL | 1 |
| P2.1 | Backtest overfitting / lookahead bias | CRITICAL | 2 |
| P2.2 | Online RL model degradation | CRITICAL | 2 |
| P3.1 | FHE performance reality misapplied | CRITICAL | 3 |
| P4.1 | Hot spot partitioning | CRITICAL | 1 |
| P5.1 | React re-render storms | CRITICAL | 4 |
| P6.1 | Crossing execution boundary | CRITICAL | 1 |
| P7.1 | Building infra before validating V1 | CRITICAL | ALL |
| P1.3 | CAS spinlocks disguised as lock-free | HIGH | 1 |
| P1.5 | Event time vs processing time | HIGH | 1 |
| P2.3 | "Quantum" washing | HIGH | 3 |
| P2.4 | RL reward function design | HIGH | 2 |
| P3.2 | CKKS noise accumulation | HIGH | 3 |
| P4.2 | Cross-region consistency latency | HIGH | 2 |
| P5.2 | WebGPU compatibility gap | HIGH | 4 |
| P6.2 | CME data licensing cost | HIGH | 1 |
| P7.2 | Polyglot monorepo complexity | HIGH | 1 |
