import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import asyncpg
import jwt
import pyotp
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry import trace
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

DB_DSN = os.environ.get("DATABASE_URL")
SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is required")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("auth")

# --- OpenTelemetry ---
resource = Resource.create({SERVICE_NAME: "nexus-auth"})
trace_provider = TracerProvider(resource=resource)
trace_provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
trace.set_tracer_provider(trace_provider)
tracer = trace.get_tracer("auth.tracer")

reader = PrometheusMetricReader()
meter_provider = MeterProvider(resource=resource, metric_readers=[reader])

limiter = Limiter(key_func=get_remote_address)
request_times: list[float] = []

# --- Global DB pool ---
db_pool: asyncpg.Pool | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    logger.info("Auth service starting up")
    if DB_DSN:
        db_pool = await asyncpg.create_pool(dsn=DB_DSN, min_size=2, max_size=10)
        logger.info("DB pool created")
    yield
    if db_pool:
        await db_pool.close()
    logger.info("Auth service shutting down")


app = FastAPI(
    title="NEXUS Auth Service",
    description="Authentication and authorization service with TOTP 2FA.",
    version="0.1.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:80").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: str | None = None


@app.middleware("http")
async def log_requests(request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed = time.time() - start
    request_times.append(elapsed)
    if len(request_times) > 1000:
        request_times.pop(0)
    logger.info("%s %s - %d - %.3fs", request.method, request.url.path, response.status_code, elapsed)
    return response


async def get_db() -> asyncpg.Connection:
    if not db_pool:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database pool not available",
        )
    return await db_pool.acquire()


@app.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(user: UserCreate):
    conn = await get_db()
    try:
        existing = await conn.fetchval(
            "SELECT id FROM users WHERE email = $1", user.email
        )
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        user_id = uuid.uuid4()
        hashed = pwd_context.hash(user.password)
        await conn.execute(
            "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)",
            user_id,
            user.email,
            hashed,
        )
        logger.info("User registered: %s", user.email)
        return {"message": "User registered successfully", "id": str(user_id)}
    finally:
        await db_pool.release(conn)


@app.post("/totp/enable")
@limiter.limit("10/minute")
async def enable_totp(email: EmailStr):
    conn = await get_db()
    try:
        row = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1", email
        )
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        secret = pyotp.random_base32()
        await conn.execute(
            "UPDATE users SET totp_secret = $1 WHERE email = $2",
            secret,
            email,
        )
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=email, issuer_name="NEXUS"
        )
        return {"secret": secret, "uri": totp_uri}
    finally:
        await db_pool.release(conn)


@app.post("/login")
@limiter.limit("20/minute")
async def login(user_login: UserLogin):
    conn = await get_db()
    try:
        row = await conn.fetchrow(
            "SELECT id, password_hash, totp_secret FROM users WHERE email = $1",
            user_login.email,
        )
        if not row or not pwd_context.verify(user_login.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if row["totp_secret"]:
            if not user_login.totp_code:
                raise HTTPException(status_code=401, detail="TOTP code required")
            totp = pyotp.TOTP(row["totp_secret"])
            if not totp.verify(user_login.totp_code, valid_window=1):
                raise HTTPException(status_code=401, detail="Invalid TOTP code")

        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {"sub": str(row["id"]), "exp": expire}
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        logger.info("User logged in: %s", user_login.email)
        return {"access_token": token, "token_type": "bearer"}
    finally:
        await db_pool.release(conn)


@app.get("/health")
async def health_check():
    try:
        conn = await get_db()
        await conn.execute("SELECT 1")
        await db_pool.release(conn)
        return {"status": "healthy", "database": "connected"}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unavailable: {exc}",
        )


@app.get("/metrics")
async def metrics():
    avg_latency = sum(request_times[-100:]) / max(len(request_times[-100:]), 1)
    return {
        "total_requests": len(request_times),
        "avg_latency_ms": round(avg_latency * 1000, 2),
    }
