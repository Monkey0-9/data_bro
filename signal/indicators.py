import os
import pandas as pd
import pandas_ta as ta
import psycopg2
from typing import Literal

# Enterprise momentum indicator using QuestDB + TA-Lib
# Queries real tick data and computes RSI with proper lookback

QUESTDB_HOST = os.environ.get("QUESTDB_HOST", "localhost")
QUESTDB_PG_PORT = int(os.environ.get("QUESTDB_PG_PORT", "8812"))


def _get_ticks(symbol: str, limit: int = 100) -> pd.DataFrame:
    """Fetch recent ticks from QuestDB for RSI calculation."""
    try:
        conn = psycopg2.connect(
            host=QUESTDB_HOST,
            port=QUESTDB_PG_PORT,
            database="qdb",
            user="admin",
            password="quest"
        )
        query = f"""
            SELECT timestamp, price
            FROM ticks
            WHERE symbol = '{symbol}'
            ORDER BY timestamp DESC
            LIMIT {limit}
        """
        df = pd.read_sql_query(query, conn)
        conn.close()
        return df.sort_values("timestamp")
    except Exception:
        # Fallback to empty DataFrame if QuestDB unavailable
        return pd.DataFrame(columns=["timestamp", "price"])


def push_price(symbol: str, price: float) -> None:
    """No-op - ticks are persisted by ingest service via ILP."""
    pass


def momentum_signal(symbol: str) -> tuple[Literal["BUY", "SELL", "HOLD"], float]:
    """Compute RSI-based momentum signal using TA-Lib."""
    df = _get_ticks(symbol, limit=50)
    if len(df) < 14:
        return "HOLD", 0.5

    # Compute RSI with 14-period lookback
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
