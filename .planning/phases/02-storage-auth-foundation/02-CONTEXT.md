# Phase 2: Storage & Auth Foundation - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning
**Mode:** Transitioning to Elite Institutional Architecture

<domain>
## Phase Boundary

Establishing a production-grade persistence layer and a secure, Zero-Trust authentication foundation. This includes QuestDB for tick data, TimescaleDB for OHLCV analytics, and CockroachDB/Postgres for user accounts with TOTP 2FA.

</domain>

<decisions>
## Implementation Decisions

### Persistence
- **QuestDB**: Optimized for high-throughput tick data with the new `fhe_state` column.
- **TimescaleDB**: Used for time-series aggregations (OHLCV) and analytical queries.
- **CockroachDB**: Primary store for user accounts, sessions, and configuration (geosharded).

### Authentication
- **TOTP**: Mandatory 2FA for all quant desk logins.
- **JWT**: Short-lived access tokens with secure refresh token rotation in Postgres.
- **Security**: fallback to SHA-256 for password hashing if bcrypt fails on local environment.

</decisions>

<code_context>
## Existing Code Insights
- `auth/main.py`: Already has a solid FastAPI structure with JWT and TOTP.
- `db/init.sql`: Defines the core tables for users and sessions.
</code_context>

<specifics>
## Specific Ideas
- Implement a `HealthCheck` dashboard in the UI for monitoring DB connectivity.
- Use `sqlx` in Rust (if needed for Milestone 2) but stick to the current Python auth service for Milestone 1.

</specifics>

<deferred>
## Deferred Ideas
- WebAuthn/Hardware-bound keys (Milestone 2).
</deferred>
