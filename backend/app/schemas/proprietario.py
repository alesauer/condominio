from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


class ProprietarioCreate(BaseModel):
    nome: str
    cpf: str
    telefone: Optional[str] = None
    email: Optional[str] = None


class ProprietarioUpdate(BaseModel):
    nome: Optional[str] = None
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None


class ProprietarioResponse(BaseModel):
    id: UUID
    nome: str
    cpf: str
    telefone: Optional[str]
    email: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VinculoApartamento(BaseModel):
    apartamento_id: UUID
