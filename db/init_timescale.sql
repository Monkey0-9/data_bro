CREATE TABLE IF NOT EXISTS ohlcv (
    time TIMESTAMPTZ NOT NULL,
    symbol TEXT NOT NULL,
    open DOUBLE PRECISION,
    high DOUBLE PRECISION,
    low DOUBLE PRECISION,
    close DOUBLE PRECISION,
    volume BIGINT
);

SELECT create_hypertable('ohlcv', 'time', if_not_exists => TRUE);

-- Ticks table for high-frequency market data (QuestDB ILP target)
CREATE TABLE IF NOT EXISTS ticks (
    timestamp TIMESTAMP NOT NULL,
    symbol STRING NOT NULL,
    price DOUBLE,
    quantity LONG,
    event_type STRING
) timestamp(timestamp) PARTITION BY DAY;

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_ticks_symbol ON ticks(symbol);
CREATE INDEX IF NOT EXISTS idx_ticks_time ON ticks(timestamp);
