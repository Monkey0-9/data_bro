import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_predict_valid():
    resp = client.post("/signal/predict", json={
        "symbol": "NQZ6",
        "price": 18500.0,
        "volume": 100,
        "news_headline": "Tech rally continues on strong earnings",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["symbol"] == "NQZ6"
    assert "sentiment_score" in data
    assert "momentum_signal" in data
    assert data["momentum_signal"] in ("BUY", "SELL", "HOLD")
    assert data["suggested_action"] in ("ENTER_LONG", "ENTER_SHORT", "HOLD")


def test_predict_invalid_symbol():
    resp = client.post("/signal/predict", json={
        "symbol": "!!!",
        "price": -10,
        "volume": 0,
    })
    assert resp.status_code == 422


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
