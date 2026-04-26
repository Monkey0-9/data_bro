# NEXUS — Features Research

## Table Stakes (Must-Have)

| Feature | Complexity | Phase |
|---------|-----------|-------|
| Real-time tick ingestion (trades, quotes) | High | **V1** |
| Level 2 order book depth (10 levels bid/ask) | High | **V1** |
| OHLCV aggregation (1s, 1m, 5m, 1d bars) | Medium | **V1** |
| Candlestick chart with zoom/pan | Medium | **V1** |
| RL signal overlay on live chart | High | **V1** |
| Signal confidence score (0–100%) | Medium | **V1** |
| Dynamic portfolio suggestion card | High | **V1** |
| Pre-trade risk check (position limits) | Medium | **V1** |
| Real-time NLP sentiment from news (FinBERT) | High | **V1** |
| User login (email/password + TOTP) | Medium | **V1** |
| Volume profile overlay | Medium | V2 |
| VWAP, MAs, Bollinger Bands | Low | V2 |
| Multi-feed redundancy + failover | High | V2 |
| Historical tick-level backtest | High | V2 |
| Strategy parameter sweep | High | V2 |
| Threshold + ML anomaly alerts | High | V2 |
| P&L attribution by strategy/signal | High | V2 |
| Role-based access (Researcher/Trader/Risk) | Medium | V2 |
| Audit logging | Medium | V2 |

## Differentiators (Competitive Advantage)

| Feature | Complexity | Phase |
|---------|-----------|-------|
| 3D order book visualization (WebGPU/WebGL) | High | **V1** |
| 3D candlestick chart in spatial scene | High | **V1** |
| Correlation sphere (positions as nodes) | High | V2 |
| Spatial heatmap (cross-asset correlations) | High | V2 |
| Online RL model updating on live tick stream | Extreme | V1 stub / V2 full |
| Model hot-swap (zero-downtime retrain) | High | V2 |
| Multi-model ensemble (RL + sentiment + regime) | High | V2 |
| Dark pool print detection | High | V2 |
| Social media sentiment (Twitter/Reddit NLP) | Medium | V2 |
| QAOA-inspired portfolio weight optimization | High | V2 |
| Quantum annealing sim for asset allocation | High | V2 |
| WebXR mode (Vision Pro, Quest) | High | V2 |
| Homomorphic encryption of feature vectors | Extreme | V3 |
| FHE-compatible risk model (CONCRETE-ML) | Extreme | V3 |
| Satellite imagery analytics | Extreme | V3 |
| Multimodal signal fusion (price+NLP+satellite) | Extreme | V3 |
| Gesture/voice manipulation of spatial data | Extreme | V3 |
| Multi-user shared AR session | Extreme | V3 |
| Genetic algorithm live strategy evolution | Extreme | V3 |
| AI adaptive firewall (ML anomaly detection) | High | V2 |

## Anti-Features (Deliberately Excluded)

| Feature | Reason |
|---------|--------|
| Internal order execution / matching engine | Broker-dealer regulatory burden |
| Compliance reporting for institutional PMs | Different product; later milestone |
| Retail consumer UI | Dilutes prop/quant desk focus |
| Crypto features in V1 | Lowers institutional credibility |
| Robo-advisor / investment advice | RIA registration required |
| Bloomberg/Refinitiv data redistribution | Licensing prohibits it |
| Proprietary smart order routing | Execution boundary must hold |

## V1 Non-Negotiables (CME Globex ES/NQ Futures)

1. Real-time tick ingestion via CME MDP 3.0 SBE (UDP multicast)
2. Level 2 order book display (10 bid/ask levels) at tick rate
3. OHLCV aggregation (1-min bars) from tick stream
4. Candlestick chart in 3D spatial scene (Three.js WebGL)
5. 3D order book visualization — depth as spatial bars
6. RL signal overlay (momentum/regime, pre-trained Stable-Baselines3 stub)
7. Real-time NLP sentiment score from news (FinBERT via Triton)
8. Dynamic portfolio suggestion card (classical scipy optimization, pre-trade check)
9. User login with TOTP — JWT sessions
10. Signal confidence score on UI

## Competitive Gaps NEXUS Fills

| Platform | Weakness NEXUS Addresses |
|----------|--------------------------|
| Bloomberg Terminal ($24k/seat/yr) | No spatial UI; no RL signals; no adaptive encryption |
| Refinitiv/LSEG Workspace | Legacy UI; no AI-native signals; no 3D visualization |
| FactSet | No real-time trading signals; no prop desk focus |
| QuantConnect | No live spatial interface; no dark pool; no multimodal AI |
| dxFeed | Data only — no analytics, no AI, no UI |
