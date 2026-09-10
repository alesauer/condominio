"""Tests for security utilities — password hashing and JWT tokens."""
import time
from datetime import timedelta
from unittest.mock import patch

import pytest
from jose import jwt

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.config import settings


class TestPasswordHashing:
    def test_hash_and_verify(self):
        hashed = hash_password("minha_senha")
        assert hashed != "minha_senha"
        assert verify_password("minha_senha", hashed)

    def test_wrong_password_fails(self):
        hashed = hash_password("senha_correta")
        assert not verify_password("senha_errada", hashed)

    def test_same_password_different_hashes(self):
        h1 = hash_password("senha")
        h2 = hash_password("senha")
        assert h1 != h2  # bcrypt uses different salts


class TestAccessToken:
    def test_create_and_decode(self):
        token = create_access_token({"sub": "user-123"})
        payload = decode_token(token)
        assert payload["sub"] == "user-123"
        assert payload["type"] == "access"
        assert "exp" in payload

    def test_custom_expiry(self):
        token = create_access_token({"sub": "user-123"}, expires_delta=timedelta(hours=1))
        payload = decode_token(token)
        assert payload["sub"] == "user-123"

    def test_expired_token_raises(self):
        token = create_access_token({"sub": "user-123"}, expires_delta=timedelta(seconds=-1))
        with pytest.raises(ValueError, match="Token inválido ou expirado"):
            decode_token(token)

    def test_invalid_token_raises(self):
        with pytest.raises(ValueError, match="Token inválido ou expirado"):
            decode_token("token-invalido")


class TestRefreshToken:
    def test_create_and_decode(self):
        token = create_refresh_token({"sub": "user-123"})
        payload = decode_token(token)
        assert payload["sub"] == "user-123"
        assert payload["type"] == "refresh"

    def test_access_vs_refresh_types(self):
        access = create_access_token({"sub": "1"})
        refresh = create_refresh_token({"sub": "1"})
        assert decode_token(access)["type"] == "access"
        assert decode_token(refresh)["type"] == "refresh"


class TestTokenEdgeCases:
    def test_token_with_extra_claims(self):
        token = create_access_token({"sub": "user-123", "role": "admin"})
        payload = decode_token(token)
        assert payload["role"] == "admin"

    def test_token_with_numeric_sub_raises(self):
        """jose requires subject to be a string."""
        token = create_access_token({"sub": 42})
        with pytest.raises(ValueError):
            decode_token(token)

    def test_empty_string_token_raises(self):
        with pytest.raises(ValueError):
            decode_token("")

    def test_malformed_token_raises(self):
        with pytest.raises(ValueError):
            decode_token("a.b.c")
