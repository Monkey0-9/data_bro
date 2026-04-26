# Phase 2: Storage & Auth Foundation - Research

## 1. QuestDB Tick Retention
- **Schema**: Table `ticks` with columns `symbol` (symbol), `price` (double), `qty` (long), `ingestion_timestamp` (timestamp), `exchange_timestamp` (timestamp).
- **Partitioning**: Partition by `DAY`.
- **Retention**: QuestDB allows dropping partitions. A scheduled job (or cron) can run `ALTER TABLE ticks DROP PARTITION ...` for data older than 90 days.

## 2. TimescaleDB OHLCV Analytics
- **Schema**: Table `ohlcv` with `time` (timestamp), `symbol` (text), `open`, `high`, `low`, `close` (numeric), `volume` (bigint).
- **Setup**: Create a hypertable on `time`.
- **Aggregates**: Use Continuous Aggregates for 5-minute, 1-hour, and 1-day rollups from the base 1-minute table if Flink writes 1-minute bars directly, or from ticks if Flink writes to Timescale directly. We will assume Flink writes 1m bars to TimescaleDB, and TimescaleDB rolls them up.

## 3. CockroachDB User Accounts
- **Architecture**: Distributed SQL. Compatible with PostgreSQL drivers.
- **Schema**:
  - `users`: id, email, password_hash, totp_secret, created_at.
  - `sessions`: id, user_id, refresh_token, expires_at.
- **Security**: Passwords hashed with bcrypt.

## 4. Auth Service (Python FastAPI)
- **Framework**: FastAPI is ideal for high-performance, async Python web services.
- **JWT**: Use `PyJWT` for issuing and verifying access tokens. Short expiry (15 mins).
- **TOTP**: Use `pyotp` for generating and verifying Google Authenticator compatible TOTP codes.
- **Database Access**: Use `asyncpg` or `SQLAlchemy` async to interact with CockroachDB.

## Validation Architecture
- **Integration**: Verify all 3 databases start and accept connections.
- **Auth Flow**: Run integration tests to register a user, log in, generate a TOTP secret, verify TOTP, and receive a JWT. Verify access to a protected route.
