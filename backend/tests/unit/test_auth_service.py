"""Tests for auth_service — authenticate, refresh, revoke."""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch, ANY

import pytest
from fastapi import HTTPException

from app.services.auth_service import authenticate, refresh_access_token, revoke_refresh_token
from app.models.usuario import Usuario, RoleUsuario
from app.core.security import hash_password, create_refresh_token


def make_mock_result(scalar_one_or_none_return=None):
    """Create a sync mock result for SQLAlchemy execute."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = scalar_one_or_none_return
    return result


class TestAuthenticate:
    async def test_success(self, mock_db):
        user = Usuario(
            id=uuid.uuid4(), nome="Admin", email="admin@test.com",
            senha_hash=hash_password("secret"), role=RoleUsuario.admin, ativo=True,
        )
        # First call (user query) returns user, second call (token insert) is mocked
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=user)

        result = await authenticate(mock_db, "admin@test.com", "secret")
        assert "access_token" in result
        assert "refresh_token" in result

    async def test_wrong_password(self, mock_db):
        user = Usuario(
            id=uuid.uuid4(), nome="Admin", email="admin@test.com",
            senha_hash=hash_password("correct"), role=RoleUsuario.admin, ativo=True,
        )
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=user)

        with pytest.raises(HTTPException) as exc:
            await authenticate(mock_db, "admin@test.com", "wrong")
        assert exc.value.status_code == 401

    async def test_user_not_found(self, mock_db):
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=None)

        with pytest.raises(HTTPException) as exc:
            await authenticate(mock_db, "not@found.com", "secret")
        assert exc.value.status_code == 401

    async def test_inactive_user(self, mock_db):
        user = Usuario(
            id=uuid.uuid4(), nome="Inativo", email="inativo@test.com",
            senha_hash=hash_password("secret"), role=RoleUsuario.morador, ativo=False,
        )
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=user)

        with pytest.raises(HTTPException) as exc:
            await authenticate(mock_db, "inativo@test.com", "secret")
        assert exc.value.status_code == 401
        assert "inativo" in str(exc.value.detail).lower()


class TestRefreshAccessToken:
    async def test_valid_refresh(self, mock_db):
        user_id = str(uuid.uuid4())
        refresh_token = create_refresh_token({"sub": user_id})

        from app.models.token_refresh import TokenRefresh
        token_record = TokenRefresh(
            id=uuid.uuid4(),
            token=refresh_token,
            usuario_id=uuid.UUID(user_id),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            revoked=False,
        )
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=token_record)

        result = await refresh_access_token(mock_db, refresh_token)
        assert "access_token" in result

    async def test_revoked_token(self, mock_db):
        user_id = str(uuid.uuid4())
        refresh_token = create_refresh_token({"sub": user_id})

        from app.models.token_refresh import TokenRefresh
        token_record = TokenRefresh(
            id=uuid.uuid4(),
            token=refresh_token,
            usuario_id=uuid.UUID(user_id),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            revoked=True,
        )
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=None)

        with pytest.raises(HTTPException) as exc:
            await refresh_access_token(mock_db, refresh_token)
        assert exc.value.status_code == 401

    async def test_expired_token(self, mock_db):
        """Test with an expired refresh token."""
        # Create a token with an expiry that's already past
        from app.core.security import create_access_token
        # Use access token (shorter expiry) that's already expired
        from datetime import timedelta
        token = create_access_token({"sub": str(uuid.uuid4())}, expires_delta=timedelta(days=-1))
        from app.models.token_refresh import TokenRefresh
        token_record = TokenRefresh(
            id=uuid.uuid4(),
            token=token,
            usuario_id=uuid.uuid4(),
            expires_at=datetime.now(timezone.utc) - timedelta(days=1),
            revoked=False,
        )
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=token_record)

        with pytest.raises(HTTPException) as exc:
            await refresh_access_token(mock_db, token)
        assert exc.value.status_code == 401


class TestRevokeRefreshToken:
    async def test_revoke_existing(self, mock_db):
        from app.models.token_refresh import TokenRefresh
        token_record = TokenRefresh(id=uuid.uuid4(), token="some-token", revoked=False)
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=token_record)

        await revoke_refresh_token(mock_db, "some-token")
        assert token_record.revoked is True
        mock_db.commit.assert_awaited_once()

    async def test_revoke_nonexistent(self, mock_db):
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=None)
        # Should not raise
        await revoke_refresh_token(mock_db, "nonexistent-token")
        mock_db.commit.assert_not_called()
