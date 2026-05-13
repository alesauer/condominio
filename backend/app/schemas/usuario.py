from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr
from app.models.usuario import RoleUsuario


class UsuarioCreate(BaseModel):
    nome: str
    email: str
    password: str
    role: RoleUsuario = RoleUsuario.morador


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    role: Optional[RoleUsuario] = None
    ativo: Optional[bool] = None


class UsuarioResponse(BaseModel):
    id: UUID
    nome: str
    email: str
    role: RoleUsuario
    ativo: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UsuarioMeResponse(BaseModel):
    id: UUID
    nome: str
    email: str
    role: RoleUsuario

    class Config:
        from_attributes = True
