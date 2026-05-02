# Phase Plan: Storage & Auth Foundation (02)

Establishing the durable persistence layer and secure authentication gateway.

## 🎯 Objectives
- [ ] Finalize QuestDB schema and verify Flink sink.
- [ ] Implement robust TOTP/JWT authentication in the `auth` service.
- [ ] Create TimescaleDB hypertable for OHLCV analytics.
- [ ] Integrate Auth service with the UI login flow.

## 🛠️ Tasks

### Wave 1: Database Hardening
- [ ] **Task 1**: Verify `db/init.sql` execution and create `ohlcv` hypertable in TimescaleDB.
- [ ] **Task 2**: Update `docker-compose.yml` healthchecks for all database services.
- [ ] **Task 3**: implement a basic SQL-based "session cleaner" in the auth service.

### Wave 2: Auth Flow Integration
- [ ] **Task 4**: Ensure `auth/main.py` uses portable hashing (`passlib[totp,sha256_crypt]`).
- [ ] **Task 5**: Update `ui/src/components/AuthFlow.tsx` to handle the TOTP challenge during login.
- [ ] **Task 6**: Verify JWT token validation across `auth` and `signal` services.

## 🧪 Verification Plan (UAT)
- [ ] Successfully register a user and enable TOTP.
- [ ] Login with password + TOTP and receive a valid JWT.
- [ ] Verify `ticks` table in QuestDB has data with `fhe_state`.

## 🔗 References
- [ROADMAP.md](../../ROADMAP.md)
- [auth/main.py](../../../auth/main.py)
- [db/init.sql](../../../db/init.sql)
