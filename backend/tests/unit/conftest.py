"""Minimal conftest for unit tests — no real DB needed."""
import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["CORS_ORIGINS"] = '["*"]'

import pytest
from unittest.mock import AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def mock_db():
    """Mocked AsyncSession for service unit tests."""
    return AsyncMock()


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"
