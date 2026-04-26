# Phase 2: Storage & Auth Foundation - Validation Strategy

**Status:** Draft
**Phase:** 2
**Date:** 2026-04-26

## 1. Goal Backward Validation
- [ ] Verify TimescaleDB starts and tables/hypertables can be created.
- [ ] Verify CockroachDB starts and user tables can be created.
- [ ] Verify Auth Service allows user registration.
- [ ] Verify Auth Service issues JWT upon valid login and TOTP.

## 2. Boundary Integrity Validation
- [ ] Database Connection: Verify Auth service connects to CockroachDB.
- [ ] Flink to Timescale: Verify Flink job can connect to TimescaleDB (conceptually).

## 3. Dimension 8: Non-Functional Validation
- [ ] **Security**: Passwords must be hashed. JWTs must be signed.
- [ ] **Persistence**: Database volumes must map to persistent storage to survive restarts.
