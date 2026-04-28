import os
os.environ.setdefault("SECRET_KEY", "test-secret-key-32-bytes-long!!")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "15")

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_check_no_db():
    response = client.get("/health")
    # DB not configured in test env, expect 503
    assert response.status_code == 503


def test_register_validation():
    # Password too short
    resp = client.post("/register", json={"email": "test@example.com", "password": "short"})
    assert resp.status_code == 422

    # Invalid email
    resp = client.post("/register", json={"email": "not-an-email", "password": "validpass123"})
    assert resp.status_code == 422
