from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import admin_required
from app.api.deps import get_current_user
from app.schemas.auth import LoginRequest, LoginResponse, RefreshRequest, RefreshResponse, MessageResponse
from app.schemas.usuario import UsuarioMeResponse
from app.services import auth_service
from app.models.usuario import Usuario

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.authenticate(db, data.email, data.password)


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.refresh_access_token(db, data.refresh_token)


@router.post("/logout", response_model=MessageResponse)
async def logout(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.revoke_refresh_token(db, data.refresh_token)
    return {"message": "Logout realizado com sucesso"}


@router.get("/me", response_model=UsuarioMeResponse)
async def me(current_user: Usuario = Depends(get_current_user)):
    return current_user
