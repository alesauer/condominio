from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.usuario import Usuario
from app.models.token_refresh import TokenRefresh
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.config import settings


async def authenticate(db: AsyncSession, email: str, password: str) -> dict:
    result = await db.execute(select(Usuario).where(Usuario.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou senha inválidos")

    if not user.ativo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inativo")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token_str = create_refresh_token({"sub": str(user.id)})

    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    token_refresh = TokenRefresh(
        usuario_id=user.id,
        token=refresh_token_str,
        expires_at=expires_at,
    )
    db.add(token_refresh)
    await db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_str,
        "token_type": "bearer",
    }


async def refresh_access_token(db: AsyncSession, refresh_token_str: str) -> dict:
    try:
        payload = decode_token(refresh_token_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tipo de token inválido")

    result = await db.execute(
        select(TokenRefresh).where(
            TokenRefresh.token == refresh_token_str,
            TokenRefresh.revoked == False,
        )
    )
    token_record = result.scalar_one_or_none()

    if not token_record:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token não encontrado ou revogado")

    if token_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expirado")

    user_id = payload.get("sub")
    new_access_token = create_access_token({"sub": user_id})

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
    }


async def revoke_refresh_token(db: AsyncSession, refresh_token_str: str) -> None:
    result = await db.execute(
        select(TokenRefresh).where(TokenRefresh.token == refresh_token_str)
    )
    token_record = result.scalar_one_or_none()
    if token_record:
        token_record.revoked = True
        await db.commit()
