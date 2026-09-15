"""
Global test configuration and fixtures.
Uses a dedicated PostgreSQL database for integration tests (condo_test).
"""
import os

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5435/condo")
)

os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["CORS_ORIGINS"] = '["*"]'

import uuid
import pytest
import pytest_asyncio
from typing import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from httpx import ASGITransport, AsyncClient


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture
def test_engine():
    """Create engine once per session."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    yield engine
    import asyncio
    try:
        asyncio.run(engine.dispose())
    except RuntimeError:
        pass


async def _init_db(test_engine):
    """Create all tables and clean data between tests."""
    import app.models  # noqa: F401
    from app.core.database import Base as _Base
    from sqlalchemy import text

    async with test_engine.begin() as conn:
        await conn.run_sync(_Base.metadata.create_all)
        for table in reversed(_Base.metadata.sorted_tables):
            try:
                await conn.execute(text(f'TRUNCATE TABLE "{table.name}" CASCADE;'))
            except Exception:
                pass



@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncIterator[AsyncSession]:
    """Provide a test database session with auto setup/teardown."""
    await _init_db(test_engine)
    session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
def admin_user():
    from app.models.usuario import Usuario, RoleUsuario
    return Usuario(id=uuid.uuid4(), nome="Admin Teste", email="admin@teste.com", senha_hash="fake_hash", role=RoleUsuario.admin, ativo=True)


@pytest.fixture
def regular_user():
    from app.models.usuario import Usuario, RoleUsuario
    return Usuario(id=uuid.uuid4(), nome="Morador Teste", email="morador@teste.com", senha_hash="fake_hash", role=RoleUsuario.morador, ativo=True)


@pytest_asyncio.fixture
async def client_admin(db_session: AsyncSession, admin_user) -> AsyncIterator[AsyncClient]:
    """HTTPX client with admin auth and test DB."""
    from app.core.database import get_db
    from app.api.deps import get_current_user
    from app.main import app

    async def override_get_db():
        yield db_session

    async def override_get_current_user():
        return admin_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client_morador(db_session: AsyncSession, regular_user) -> AsyncIterator[AsyncClient]:
    """HTTPX client with regular morador auth (read-only) and test DB."""
    from app.core.database import get_db
    from app.api.deps import get_current_user
    from app.main import app

    async def override_get_db():
        yield db_session

    async def override_get_current_user():
        return regular_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client_proprietario(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    """HTTPX client with proprietario auth (read-only) and test DB."""
    from app.core.database import get_db
    from app.api.deps import get_current_user
    from app.models.usuario import Usuario, RoleUsuario
    from app.main import app

    prop_user = Usuario(id=uuid.uuid4(), nome="Proprietário Teste", email="prop@teste.com", senha_hash="fake_hash", role=RoleUsuario.proprietario, ativo=True)

    async def override_get_db():
        yield db_session

    async def override_get_current_user():
        return prop_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()

