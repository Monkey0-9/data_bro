# Enterprise sentiment analysis using FinBERT transformer model
# Financial domain-specific BERT model for market sentiment

from transformers import pipeline
from typing import Optional

# Lazy-load model on first use
_pipeline = None


def _get_pipeline():
    """Load FinBERT pipeline on first call."""
    global _pipeline
    if _pipeline is None:
        _pipeline = pipeline(
            "sentiment-analysis",
            model="ProsusAI/finbert",
            tokenizer="ProsusAI/finbert"
        )
    return _pipeline


def score(headline: Optional[str]) -> float:
    """Compute sentiment score using FinBERT. Returns float in [-1, 1]."""
    if not headline:
        return 0.0

    try:
        result = _get_pipeline()(headline)[0]
        label = result["label"]
        confidence = result["score"]

        # FinBERT labels: positive, negative, neutral
        if label == "positive":
            return confidence
        elif label == "negative":
            return -confidence
        else:  # neutral
            return 0.0
    except Exception:
        # Fallback to 0 on model error
        return 0.0
