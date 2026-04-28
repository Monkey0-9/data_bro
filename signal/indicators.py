from collections import deque
from typing import Dict, Literal

# Simple momentum / RSI-like indicator backed by a rolling price window.
# In production, wire this to a real tick database.

_price_history: Dict[str, deque] = {}
_MAX_LEN = 20


def _get_window(symbol: str) -> deque:
    if symbol not in _price_history:
        _price_history[symbol] = deque(maxlen=_MAX_LEN)
    return _price_history[symbol]


def push_price(symbol: str, price: float) -> None:
    _get_window(symbol).append(price)


def momentum_signal(symbol: str) -> tuple[Literal["BUY", "SELL", "HOLD"], float]:
    window = _get_window(symbol)
    n = len(window)
    if n < 3:
        return "HOLD", 0.5

    prices = list(window)
    # Simple 2-period RSI-like oscillator
    gains = sum(
        prices[i] - prices[i - 1]
        for i in range(1, n)
        if prices[i] > prices[i - 1]
    )
    losses = sum(
        abs(prices[i] - prices[i - 1])
        for i in range(1, n)
        if prices[i] < prices[i - 1]
    )
    if losses == 0:
        rsi = 100.0
    else:
        rs = gains / losses
        rsi = 100.0 - (100.0 / (1.0 + rs))

    if rsi > 70:
        return "SELL", round(rsi / 100.0, 4)
    elif rsi < 30:
        return "BUY", round((100.0 - rsi) / 100.0, 4)
    else:
        return "HOLD", round(0.5 + abs(50.0 - rsi) / 100.0, 4)
