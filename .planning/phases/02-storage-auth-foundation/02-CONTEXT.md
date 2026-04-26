# Phase 2: Storage & Auth Foundation - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning
**Mode:** Auto-generated (Infrastructure/Backend phase)

<domain>
## Phase Boundary

Durable, production-grade data storage and user authentication operational. QuestDB tick retention, TimescaleDB OHLCV analytics, CockroachDB user accounts, JWT + TOTP auth flow.

</domain>

<decisions>
## Implementation Decisions

### the agent's Discretion
Database schemas and auth service technical implementation details are at the agent's discretion.
- **QuestDB**: Hot tick storage schema and retention policy (90 days).
- **TimescaleDB**: OHLCV data and continuous aggregates.
- **CockroachDB**: User state, sessions, and configuration.
- **Auth Service**: Python or Node.js service for JWT and TOTP. Use standard libraries (e.g., `passlib`, `PyJWT`, `pyotp` if Python).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docker-compose.yml` already contains a basic QuestDB service from Phase 1.

### Established Patterns
- Monorepo structure defined in Phase 1.

</code_context>

<specifics>
## Specific Ideas

- Implement a standalone Auth Service. Let's use Python (FastAPI) for this to stay aligned with the ML stack that will be built later.
- Update `docker-compose.yml` to include TimescaleDB, CockroachDB, and the new Auth Service.

</specifics>

<deferred>
## Deferred Ideas

- Signal generation and portfolio optimization (Phase 3).
- Frontend UI (Phase 4).

</deferred>
