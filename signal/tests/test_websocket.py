import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

from main import app


def test_websocket_connect():
    client = TestClient(app)
    with client.websocket_connect("/ws/signals") as websocket:
        websocket.send_text("ping")
        data = websocket.receive_text()
        assert data == "pong"


def test_websocket_disconnect():
    client = TestClient(app)
    with client.websocket_connect("/ws/signals") as websocket:
        pass  # disconnect on exit
