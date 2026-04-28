import re
from typing import Dict

# Lightweight deterministic sentiment scorer.
# In production, swap for transformers + FinBERT.

_POSITIVE = {
    "up", "rise", "rising", "rally", "rallies", "bull", "bullish", "growth",
    "strong", "beat", "beats", "outperform", "surge", "surges", "gain", "gains",
    "rallying", "soar", "soars", "jump", "jumps", "buy", "accumulate", "upgrade",
    "upgraded", "positive", "optimistic", "confidence", "recovery", "recovering",
    "expansion", "record", "high", "higher", "profit", "profits", "earnings",
}

_NEGATIVE = {
    "down", "fall", "falling", "decline", "declines", "drop", "drops", "bear",
    "bearish", "weak", "miss", "misses", "underperform", "plunge", "plunges",
    "loss", "losses", "selling", "sell", "dump", "dumps", "crash", "crashes",
    "downgrade", "downgraded", "negative", "pessimistic", "fear", "concern",
    "recession", "low", "lower", "debt", "bankrupt", "bankruptcy", "layoff",
    "layoffs", "cut", "cuts", "warning", "warn", "warns", "investigation",
}

_INTENSIFIERS = {
    "very", "extremely", "highly", "significantly", "substantially", "massively",
    "sharply", "steeply", "heavily", "strongly",
}

_NEGATORS = {"not", "no", "never", "neither", "hardly", "barely", "scarcely"}


def score(headline: str | None) -> float:
    if not headline:
        return 0.0

    tokens = re.findall(r"[A-Za-z]+", headline.lower())
    score_val = 0.0
    i = 0
    while i < len(tokens):
        token = tokens[i]
        multiplier = 1.0

        # Look behind for negator/intensifier
        if i > 0:
            if tokens[i - 1] in _NEGATORS:
                multiplier *= -1.0
            elif tokens[i - 1] in _INTENSIFIERS:
                multiplier *= 1.5

        if token in _POSITIVE:
            score_val += 1.0 * multiplier
        elif token in _NEGATIVE:
            score_val -= 1.0 * multiplier
        i += 1

    # Normalize roughly to [-1, 1]
    raw = score_val / max(len(tokens) * 0.3, 1.0)
    return max(-1.0, min(1.0, raw))
