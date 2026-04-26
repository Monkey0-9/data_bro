---
wave: 1
depends_on: []
files_modified:
  - docker-compose.yml
  - auth/requirements.txt
  - auth/main.py
  - db/init_cockroach.sql
  - db/init_timescale.sql
autonomous: true
requirements_addressed: [STORE-01, STORE-02, STORE-03, STORE-04, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06]
---

# Phase 2: Storage & Auth Foundation Implementation

<objective>
Implement the storage infrastructure (CockroachDB, TimescaleDB) and the Python FastAPI Authentication Service handling JWTs and TOTP.
</objective>

<tasks>
<task>
  <description>Update Docker Compose for Databases</description>
  <read_first>
    - .planning/phases/02-storage-auth-foundation/02-RESEARCH.md
    - docker-compose.yml
  </read_first>
  <action>
    Modify `docker-compose.yml` to add a `timescaledb` service (using `timescale/timescaledb:latest-pg14`) and a `cockroachdb` service (using `cockroachdb/cockroach:v23.1.5`).
    Configure persistent volumes for both.
    Add the new `auth-service` to `docker-compose.yml` mapped to build from `./auth`.
  </action>
  <acceptance_criteria>
    - `docker-compose.yml` contains a `timescaledb` service.
    - `docker-compose.yml` contains a `cockroachdb` service.
    - `docker-compose.yml` contains an `auth-service`.
  </acceptance_criteria>
</task>

<task>
  <description>Database Initialization Scripts</description>
  <read_first>
    - .planning/phases/02-storage-auth-foundation/02-RESEARCH.md
  </read_first>
  <action>
    Create `db/init_timescale.sql` to create an `ohlcv` table and turn it into a hypertable.
    Create `db/init_cockroach.sql` to create `users` and `sessions` tables.
  </action>
  <acceptance_criteria>
    - `db/init_timescale.sql` exists and contains `create_hypertable`.
    - `db/init_cockroach.sql` exists and contains `CREATE TABLE users`.
  </acceptance_criteria>
</task>

<task>
  <description>Create Auth Service</description>
  <read_first>
    - .planning/phases/02-storage-auth-foundation/02-RESEARCH.md
  </read_first>
  <action>
    Create the `auth` directory.
    Create `auth/requirements.txt` containing `fastapi`, `uvicorn`, `PyJWT`, `pyotp`, `passlib[bcrypt]`, `asyncpg`.
    Create `auth/main.py`. Implement FastAPI app with routes:
    - `POST /register`: Accepts email/password, hashes password, stores in DB (mocked DB connection for now is fine if full asyncpg setup is too complex, but structure should be there).
    - `POST /login`: Validates credentials, checks TOTP, returns JWT.
    - `POST /totp/enable`: Generates a TOTP secret for the user.
  </action>
  <acceptance_criteria>
    - `auth/requirements.txt` contains `fastapi` and `PyJWT`.
    - `auth/main.py` contains `@app.post("/register")` and `@app.post("/login")`.
  </acceptance_criteria>
</task>
</tasks>

<must_haves>
- Auth service must successfully compile/run (e.g., `uvicorn main:app --reload`).
- Database definitions must be valid SQL.
</must_haves>
