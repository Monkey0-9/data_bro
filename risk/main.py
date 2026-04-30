import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict
import numpy as np
import pandas as pd
import asyncpg
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("risk")

QUESTDB_HOST = os.environ.get("QUESTDB_HOST", "localhost")
QUESTDB_PG_PORT = int(os.environ.get("QUESTDB_PG_PORT", "8812"))
QUESTDB_USER = os.environ.get("QUESTDB_USER", "admin")
QUESTDB_PASSWORD = os.environ.get("QUESTDB_PASSWORD")
if not QUESTDB_PASSWORD:
    raise RuntimeError("QUESTDB_PASSWORD environment variable is required")
QUESTDB_DATABASE = os.environ.get("QUESTDB_DATABASE", "qdb")

# Global asyncpg pool
pool: asyncpg.Pool | None = None

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="NEXUS Risk Management", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class Position(BaseModel):
    symbol: str
    quantity: int
    entry_price: float
    current_price: float


class VaRRequest(BaseModel):
    positions: List[Position]
    confidence_level: float = Field(default=0.95, gt=0, le=1)
    time_horizon_days: int = Field(default=1, gt=0)


class VaRResult(BaseModel):
    total_value: float
    var_95: float
    var_99: float
    expected_shortfall_95: float
    max_position_risk: str
    risk_alert: bool


async def fetch_price_history(symbol: str, days: int = 252) -> pd.DataFrame:
    """Fetch historical price data for VaR calculation using asyncpg pool."""
    global pool
    if pool is None:
        logger.error("Database pool not initialized")
        return pd.DataFrame()
    
    try:
        async with pool.acquire() as conn:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Parameterized query to prevent SQL injection
            query = """
                SELECT timestamp, price
                FROM ticks
                WHERE symbol = $1
                AND timestamp BETWEEN $2 AND $3
                ORDER BY timestamp ASC
            """
            rows = await conn.fetch(query, symbol, start_date, end_date)
            
            if not rows:
                return pd.DataFrame()
            
            df = pd.DataFrame([dict(row) for row in rows])
            return df
    except Exception as e:
        logger.error(f"Failed to fetch price history for {symbol}: {e}")
        return pd.DataFrame()


def calculate_returns(prices: pd.Series) -> np.ndarray:
    """Calculate log returns from price series."""
    return np.log(prices / prices.shift(1)).dropna().values


def calculate_var(returns: np.ndarray, confidence: float) -> float:
    """Calculate Value at Risk using historical simulation."""
    if len(returns) == 0:
        return 0.0
    var_percentile = (1 - confidence) * 100
    return np.percentile(returns, var_percentile)


def calculate_expected_shortfall(returns: np.ndarray, confidence: float) -> float:
    """Calculate Expected Shortfall (Conditional VaR)."""
    if len(returns) == 0:
        return 0.0
    var = calculate_var(returns, confidence)
    tail_losses = returns[returns <= var]
    if len(tail_losses) == 0:
        return 0.0
    return np.mean(tail_losses)


async def calculate_portfolio_var(positions: List[Position], confidence: float, horizon_days: int) -> VaRResult:
    """Calculate portfolio VaR with position aggregation."""
    total_value = 0.0
    position_values = []
    position_vars = []
    max_risk_symbol = ""
    max_risk_value = 0.0

    for pos in positions:
        position_value = pos.quantity * pos.current_price
        total_value += position_value
        position_values.append(position_value)

        # Fetch historical data for this position
        df = await fetch_price_history(pos.symbol, days=252)
        if df.empty:
            logger.warning(f"No price history for {pos.symbol}, using 0% volatility")
            position_vars.append(0.0)
            continue

        returns = calculate_returns(df['price'])
        var = calculate_var(returns, confidence)
        position_var = abs(var * position_value)
        position_vars.append(position_var)

        if position_var > max_risk_value:
            max_risk_value = position_var
            max_risk_symbol = pos.symbol

    # Simple sum of position VaRs (no correlation matrix for simplicity)
    portfolio_var_95 = sum(position_vars) * (horizon_days ** 0.5)
    portfolio_var_99 = portfolio_var_95 * 1.5  # Approximate scaling

    # Calculate expected shortfall
    all_returns = []
    for pos in positions:
        df = await fetch_price_history(pos.symbol, days=252)
        if not df.empty:
            returns = calculate_returns(df['price'])
            all_returns.extend(returns.tolist())
    
    if all_returns:
        es_95 = abs(calculate_expected_shortfall(np.array(all_returns), 0.95)) * total_value
    else:
        es_95 = 0.0

    # Risk alert if VaR exceeds 5% of portfolio value
    risk_alert = portfolio_var_95 > (total_value * 0.05)

    return VaRResult(
        total_value=round(total_value, 2),
        var_95=round(portfolio_var_95, 2),
        var_99=round(portfolio_var_99, 2),
        expected_shortfall_95=round(es_95, 2),
        max_position_risk=max_risk_symbol,
        risk_alert=risk_alert
    )


@app.on_event("startup")
async def startup():
    """Initialize asyncpg pool on startup."""
    global pool
    pool = await asyncpg.create_pool(
        host=QUESTDB_HOST,
        port=QUESTDB_PG_PORT,
        user=QUESTDB_USER,
        password=QUESTDB_PASSWORD,
        database=QUESTDB_DATABASE,
        min_size=5,
        max_size=20
    )
    logger.info("Database pool initialized")


@app.on_event("shutdown")
async def shutdown():
    """Close asyncpg pool on shutdown."""
    global pool
    if pool:
        await pool.close()
        logger.info("Database pool closed")


@app.post("/var/calculate")
@limiter.limit("10/minute")
async def calculate_var_endpoint(request: VaRRequest) -> VaRResult:
    """Calculate portfolio Value at Risk with rate limiting."""
    if not request.positions:
        raise HTTPException(status_code=400, detail="No positions provided")
    
    result = await calculate_portfolio_var(
        request.positions,
        request.confidence_level,
        request.time_horizon_days
    )
    return result


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "risk-management"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
