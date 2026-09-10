"""Integration tests for /api/v1/auth endpoints using real DB."""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.security import hash_password, create_refresh_token
from app.models.usuario import Usuario, RoleUsuario
from app.models.token_refresh import TokenRefresh


@pytest.fixture
async def seeded_admin(db_session):
    """Create an admin user directly in the test DB."""
    admin = Usuario(
        id=uuid.uuid4(),
        nome="Admin Teste",
        email="admin@teste.com",
        senha_hash=hash_password("123456"),
        role=RoleUsuario.admin,
        ativo=True,
    )
    db_session.add(admin)
    await db_session.commit()
    return admin


class TestLogin:
    async def test_login_success(self, client_admin: AsyncClient, seeded_admin):
        """Use the /auth/login endpoint directly without auth."""
        # Override deps to not require auth for login
        from app.main import app
        from app.core.database import get_db
        from app.api.deps import get_current_user

        app.dependency_overrides[get_current_user] = lambda: seeded_admin

        response = await client_admin.post("/api/v1/auth/login", json={
            "email": "admin@teste.com",
            "password": "123456",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client_admin: AsyncClient, seeded_admin):
        response = await client_admin.post("/api/v1/auth/login", json={
            "email": "admin@teste.com",
            "password": "wrong",
        })
        assert response.status_code == 401

    async def test_login_user_not_found(self, client_admin: AsyncClient):
        response = await client_admin.post("/api/v1/auth/login", json={
            "email": "notfound@test.com",
            "password": "123456",
        })
        assert response.status_code == 401


class TestMe:
    async def test_me_authenticated(self, client_admin: AsyncClient):
        """GET /auth/me returns current user data."""
        response = await client_admin.get("/api/v1/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "nome" in data
        assert "email" in data
        assert "role" in data


class TestHealth:
    async def test_health_endpoint(self, client_admin: AsyncClient):
        response = await client_admin.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
