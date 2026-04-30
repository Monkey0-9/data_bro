import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import pandas as pd
import asyncpg
import jwt
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel, Field, validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backtest")

QUESTDB_HOST = os.environ.get("QUESTDB_HOST", "localhost")
QUESTDB_PG_PORT = int(os.environ.get("QUESTDB_PG_PORT", "8812"))
QUESTDB_USER = os.environ.get("QUESTDB_USER", "admin")
QUESTDB_PASSWORD = os.environ.get("QUESTDB_PASSWORD")
if not QUESTDB_PASSWORD:
    raise RuntimeError("QUESTDB_PASSWORD environment variable is required")
QUESTDB_DATABASE = os.environ.get("QUESTDB_DATABASE", "qdb")
SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = "HS256"

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is required")

# Global asyncpg pool
pool: asyncpg.Pool | None = None

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="NEXUS Backtesting Engine", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class BacktestConfig(BaseModel):
    symbol: str = Field(..., pattern=r"^[A-Z0-9\-\.]{1,20}$")
    start_date: str
    end_date: str
    initial_capital: float = Field(..., gt=0)
    position_size: float = Field(default=1.0, gt=0)
    
    @validator('start_date', 'end_date')
    def validate_date_format(cls, v):
        """Validate date format is ISO 8601."""
        try:
            datetime.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError("Date must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)")
    
    @validator('end_date')
    def end_after_start(cls, v, values):
        """Validate end_date is after start_date."""
        if 'start_date' in values:
            start = datetime.fromisoformat(values['start_date'])
            end = datetime.fromisoformat(v)
            if end <= start:
                raise ValueError("end_date must be after start_date")
        return v


class Trade(BaseModel):
    timestamp: str
    symbol: str
    action: str  # BUY or SELL
    price: float
    quantity: int
    pnl: float = 0.0


class BacktestResult(BaseModel):
    symbol: str
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    total_pnl: float
    max_drawdown: float
    sharpe_ratio: float
    final_capital: float
    roi: float


async def fetch_historical_ticks(symbol: str, start: str, end: str) -> pd.DataFrame:
    """Fetch historical tick data from QuestDB using asyncpg pool."""
    global pool
    if pool is None:
        logger.error("Database pool not initialized")
        return pd.DataFrame()
    
    try:
        async with pool.acquire() as conn:
            # Parameterized query to prevent SQL injection
            query = """
                SELECT timestamp, symbol, price, quantity
                FROM ticks
                WHERE symbol = $1
                AND timestamp BETWEEN $2 AND $3
                ORDER BY timestamp ASC
            """
            rows = await conn.fetch(query, symbol, start, end)
            
            if not rows:
                return pd.DataFrame()
            
            df = pd.DataFrame([dict(row) for row in rows])
            return df
    except Exception as e:
        logger.error(f"Failed to fetch historical data: {e}")
        return pd.DataFrame()


def run_rsi_strategy(df: pd.DataFrame, position_size: float, rsi_period: int = 14, buy_threshold: float = 30, sell_threshold: float = 70) -> List[Trade]:
    """Run RSI-based backtest strategy with configurable position size."""
    if len(df) < rsi_period:
        return []

    # Calculate RSI
    delta = df['price'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=rsi_period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=rsi_period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))

    trades = []
    position = 0
    entry_price = 0.0
    quantity = int(position_size)  # Use position_size from config

    for i in range(rsi_period, len(df)):
        current_rsi = rsi.iloc[i]
        price = df['price'].iloc[i]
        timestamp = df['timestamp'].iloc[i]

        if current_rsi < buy_threshold and position == 0:
            # Buy signal
            position = 1
            entry_price = price
            trades.append(Trade(
                timestamp=str(timestamp),
                symbol=df['symbol'].iloc[i],
                action="BUY",
                price=price,
                quantity=quantity
            ))
        elif current_rsi > sell_threshold and position == 1:
            # Sell signal
            position = 0
            pnl = (price - entry_price) * quantity
            trades.append(Trade(
                timestamp=str(timestamp),
                symbol=df['symbol'].iloc[i],
                action="SELL",
                price=price,
                quantity=quantity,
                pnl=pnl
            ))

    return trades


def calculate_metrics(trades: List[Trade], initial_capital: float) -> BacktestResult:
    """Calculate backtest performance metrics."""
    if not trades:
        return BacktestResult(
            symbol="",
            total_trades=0,
            winning_trades=0,
            losing_trades=0,
            win_rate=0.0,
            total_pnl=0.0,
            max_drawdown=0.0,
            sharpe_ratio=0.0,
            final_capital=initial_capital,
            roi=0.0
        )

    symbol = trades[0].symbol
    total_trades = len(trades)
    winning_trades = sum(1 for t in trades if t.pnl > 0)
    losing_trades = sum(1 for t in trades if t.pnl < 0)
    win_rate = winning_trades / total_trades if total_trades > 0 else 0.0

    total_pnl = sum(t.pnl for t in trades)
    final_capital = initial_capital + total_pnl
    roi = (total_pnl / initial_capital) * 100

    # Calculate max drawdown
    cumulative_pnl = 0.0
    peak = 0.0
    max_drawdown = 0.0
    for trade in trades:
        cumulative_pnl += trade.pnl
        if cumulative_pnl > peak:
            peak = cumulative_pnl
        drawdown = peak - cumulative_pnl
        if drawdown > max_drawdown:
            max_drawdown = drawdown

    # Calculate Sharpe ratio (simplified)
    if len(trades) > 1:
        returns = [t.pnl / initial_capital for t in trades]
        avg_return = sum(returns) / len(returns)
        std_return = (sum((r - avg_return) ** 2 for r in returns) / len(returns)) ** 0.5
        sharpe_ratio = avg_return / std_return if std_return > 0 else 0.0
    else:
        sharpe_ratio = 0.0

    return BacktestResult(
        symbol=symbol,
        total_trades=total_trades,
        winning_trades=winning_trades,
        losing_trades=losing_trades,
        win_rate=round(win_rate, 4),
        total_pnl=round(total_pnl, 2),
        max_drawdown=round(max_drawdown, 2),
        sharpe_ratio=round(sharpe_ratio, 4),
        final_capital=round(final_capital, 2),
        roi=round(roi, 2)
    )


async def run_backtest(config: BacktestConfig) -> BacktestResult:
    """Run complete backtest with given configuration."""
    logger.info(f"Starting backtest for {config.symbol} from {config.start_date} to {config.end_date}")

    df = await fetch_historical_ticks(config.symbol, config.start_date, config.end_date)
    if df.empty:
        logger.warning(f"No historical data found for {config.symbol}")
        return BacktestResult(
            symbol=config.symbol,
            total_trades=0,
            winning_trades=0,
            losing_trades=0,
            win_rate=0.0,
            total_pnl=0.0,
            max_drawdown=0.0,
            sharpe_ratio=0.0,
            final_capital=config.initial_capital,
            roi=0.0
        )

    trades = run_rsi_strategy(df, config.position_size)
    result = calculate_metrics(trades, config.initial_capital)

    logger.info(f"Backtest complete: {result.total_trades} trades, ROI: {result.roi}%")
    return result


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


def verify_token(authorization: Optional[str] = Header(None)) -> dict:
    """Verify JWT token from Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization[7:]  # Remove 'Bearer ' prefix
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.post("/backtest/run")
@limiter.limit("5/minute")
async def run_backtest_endpoint(config: BacktestConfig, _: dict = Depends(verify_token)) -> BacktestResult:
    """Run backtest with rate limiting and JWT auth."""
    return await run_backtest(config)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "backtesting-engine"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
