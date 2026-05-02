import os
import logging
import pandas as pd
import pandas_ta as ta
import asyncpg
import ctypes
from typing import Literal

# --- High Performance C++ Bindings ---
try:
    # Try loading the shared library (compiled via CMake in the C++ service)
    # libpath = os.path.join(os.path.dirname(__file__), "../cpp_signals/build/libindicators.so")
    # For now, we assume it might be in the same directory in the Docker image
    _cpp_lib = ctypes.CDLL("./libindicators.so")
    _cpp_lib.calculate_rsi.argtypes = [ctypes.POINTER(ctypes.c_double), ctypes.c_int, ctypes.c_int]
    _cpp_lib.calculate_rsi.restype = ctypes.c_double
    HAS_CPP_SIG = True
    logger.info("NEXUS High-Performance C++ indicators loaded successfully")
except Exception as e:
    HAS_CPP_SIG = False
    logger.warning(f"C++ indicators not found, falling back to pandas_ta: {e}")

# Enterprise momentum indicator using QuestDB + TA-Lib
# Queries real tick data and computes RSI with proper lookback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("indicators")

QUESTDB_HOST = os.environ.get("QUESTDB_HOST", "localhost")
QUESTDB_PG_PORT = int(os.environ.get("QUESTDB_PG_PORT", "8812"))
QUESTDB_USER = os.environ.get("QUESTDB_USER", "admin")
QUESTDB_PASSWORD = os.environ.get("QUESTDB_PASSWORD")
if not QUESTDB_PASSWORD:
    raise RuntimeError("QUESTDB_PASSWORD environment variable is required")
QUESTDB_DATABASE = os.environ.get("QUESTDB_DATABASE", "qdb")

# Global asyncpg pool for reuse across requests
_pool: asyncpg.Pool | None = None


async def _ensure_pool() -> asyncpg.Pool | None:
    """Ensure the database pool is initialized."""
    global _pool
    if _pool is None:
        try:
            _pool = await asyncpg.create_pool(
                host=QUESTDB_HOST,
                port=QUESTDB_PG_PORT,
                user=QUESTDB_USER,
                password=QUESTDB_PASSWORD,
                database=QUESTDB_DATABASE,
                min_size=2,
                max_size=10
            )
            logger.info("Database pool initialized for indicators")
        except Exception as e:
            logger.error("Failed to create pool: %s", e)
            return None
    return _pool


async def _get_ticks(symbol: str, limit: int = 100) -> pd.DataFrame:
    """Fetch recent ticks from QuestDB for RSI calculation using asyncpg pool."""
    pool = await _ensure_pool()
    if pool is None:
        return pd.DataFrame(columns=["timestamp", "price"])

    try:
        async with pool.acquire() as conn:
            # Parameterized query to prevent SQL injection
            query = """
                SELECT timestamp, price
                FROM ticks
                WHERE symbol = $1
                ORDER BY timestamp DESC
                LIMIT $2
            """
            rows = await conn.fetch(query, symbol, limit)
            if not rows:
                return pd.DataFrame(columns=["timestamp", "price"])
            df = pd.DataFrame([dict(row) for row in rows])
            return df.sort_values("timestamp")
    except Exception:
        logger.warning("QuestDB unavailable, returning empty DataFrame")
        return pd.DataFrame(columns=["timestamp", "price"])


async def push_price(symbol: str, price: float) -> None:
    """No-op - ticks are persisted by ingest service via ILP."""
    pass


async def momentum_signal(symbol: str) -> tuple[Literal["BUY", "SELL", "HOLD"], float]:
    """Compute RSI-based momentum signal using TA-Lib."""
    df = await _get_ticks(symbol, limit=250)
    if len(df) < 14:
        return "HOLD", 0.5

    if HAS_CPP_SIG:
        # Prepare data for C++ call
        prices = df["price"].values.astype(ctypes.c_double)
        n = len(prices)
        prices_ptr = prices.ctypes.data_as(ctypes.POINTER(ctypes.c_double))
        rsi = _cpp_lib.calculate_rsi(prices_ptr, n, 14)
    else:
        # Compute RSI with 14-period lookback (Wilder's smoothing)
        rsi_series = ta.rsi(df["price"], length=14)
        rsi = rsi_series.iloc[-1]

    if pd.isna(rsi):
        return "HOLD", 0.5

    if rsi > 70:
        return "SELL", round(rsi / 100.0, 4)
    elif rsi < 30:
        return "BUY", round((100.0 - rsi) / 100.0, 4)
    else:
        return "HOLD", round(0.5 + abs(50.0 - rsi) / 100.0, 4)
