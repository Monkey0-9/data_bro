import os
import pytest
from unittest.mock import AsyncMock, MagicMock

os.environ["SECRET_KEY"] = "test-secret-32-bytes-long!!"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "15"


@pytest.fixture
def mock_db_pool(monkeypatch):
    """Mock asyncpg connection pool for tests."""
    mock_conn = AsyncMock()
    mock_pool = AsyncMock()
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

    async def mock_connect(dsn=None):
        return mock_conn

    monkeypatch.setattr("asyncpg.connect", mock_connect)
    return mock_conn
