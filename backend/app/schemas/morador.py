from datetime import datetime, date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from app.models.morador import TipoMorador


class MoradorCreate(BaseModel):
    nome: str
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    veiculo: Optional[str] = None
    tipo: TipoMorador = TipoMorador.morador


class MoradorUpdate(BaseModel):
    nome: Optional[str] = None
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    veiculo: Optional[str] = None
    tipo: Optional[TipoMorador] = None


class MoradorResponse(BaseModel):
    id: UUID
    nome: str
    cpf: Optional[str]
    telefone: Optional[str]
    email: Optional[str]
    veiculo: Optional[str]
    tipo: TipoMorador
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VincularApartamento(BaseModel):
    apartamento_id: UUID
    data_inicio: date
    data_fim: Optional[date] = None
