import logging
import os
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import redis.asyncio as redis
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry import trace
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from indicators import momentum_signal, push_price
from sentiment import score as sentiment_score

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

# --- Logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("signal")

# --- OpenTelemetry ---
resource = Resource.create({SERVICE_NAME: "nexus-signal"})
trace_provider = TracerProvider(resource=resource)
trace_provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
trace.set_tracer_provider(trace_provider)
tracer = trace.get_tracer("signal.tracer")

reader = PrometheusMetricReader()
meter_provider = MeterProvider(resource=resource, metric_readers=[reader])

# --- Rate Limiting ---
limiter = Limiter(key_func=get_remote_address)

# --- WebSocket State ---
ws_clients: set[WebSocket] = set()
redis_client: redis.Redis | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    logger.info("Signal engine starting up")
    redis_client = redis.from_url(REDIS_URL)
    yield
    if redis_client:
        await redis_client.close()
    logger.info("Signal engine shutting down")


app = FastAPI(
    title="NEXUS Signal Engine",
    description="Real-time market signal engine with deterministic sentiment analysis and momentum indicators.",
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


class MarketState(BaseModel):
    symbol: str = Field(..., pattern=r"^[A-Z0-9]{1,10}$")
    price: float = Field(..., gt=0)
    volume: int = Field(..., gt=0)
    news_headline: str | None = Field(default=None, max_length=500)


class SignalResponse(BaseModel):
    symbol: str
    timestamp: str
    price: float
    volume: int
    sentiment_score: float
    momentum_signal: str
    confidence: float
    suggested_action: str


# --- Request metrics ---
request_times: list[float] = []


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


@app.post("/signal/predict", response_model=SignalResponse)
@limiter.limit("60/minute")
async def predict_signal(state: MarketState):
    await push_price(state.symbol, state.price)

    sentiment = sentiment_score(state.news_headline)
    signal, confidence = await momentum_signal(state.symbol)

    if signal == "BUY" and sentiment > 0.2:
        action = "ENTER_LONG"
    elif signal == "SELL" and sentiment < -0.2:
        action = "ENTER_SHORT"
    else:
        action = "HOLD"

    result = {
        "symbol": state.symbol,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "price": state.price,
        "volume": state.volume,
        "sentiment_score": round(sentiment, 4),
        "momentum_signal": signal,
        "confidence": round(confidence, 4),
        "suggested_action": action,
    }

    # Publish to Redis pubsub for multi-instance broadcasting
    if redis_client:
        import json
        await redis_client.publish("signals", json.dumps(result))

    # Also broadcast to local WebSocket clients
    for ws in list(ws_clients):
        try:
            await ws.send_json(result)
        except Exception:
            ws_clients.discard(ws)

    return result


@app.websocket("/ws/signals")
async def websocket_signals(websocket: WebSocket):
    await websocket.accept()
    ws_clients.add(websocket)
    logger.info("WebSocket client connected: %s", websocket.client)

    # Subscribe to Redis pubsub if available
    pubsub = None
    if redis_client:
        pubsub = redis_client.pubsub()
        await pubsub.subscribe("signals")

    try:
        # Listen for both client messages and Redis pubsub
        import asyncio
        import json

        while True:
            if pubsub:
                # Wait for Redis message with timeout
                try:
                    message = await asyncio.wait_for(pubsub.get_message(timeout=1.0))
                    if message and message["type"] == "message":
                        data = json.loads(message["data"])
                        await websocket.send_json(data)
                except asyncio.TimeoutError:
                    # Check for client ping
                    try:
                        data = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                        if data == "ping":
                            await websocket.send_text("pong")
                    except asyncio.TimeoutError:
                        continue
            else:
                # Fallback: client ping/pong only
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    finally:
        ws_clients.discard(websocket)
        if pubsub:
            await pubsub.unsubscribe("signals")
            await pubsub.close()


@app.get("/health")
async def health():
    avg_latency = sum(request_times[-100:]) / max(len(request_times[-100:]), 1)
    return {
        "status": "ok",
        "uptime": "running",
        "avg_request_latency_ms": round(avg_latency * 1000, 2),
        "active_websocket_clients": len(ws_clients),
    }


@app.get("/metrics")
async def metrics():
    return {
        "total_requests": len(request_times),
        "avg_latency_ms": round((sum(request_times) / max(len(request_times), 1)) * 1000, 2),
        "active_ws_clients": len(ws_clients),
    }
