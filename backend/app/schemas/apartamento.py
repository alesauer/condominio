from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel
from app.models.apartamento import TipoApartamento, StatusApartamento


class ApartamentoCreate(BaseModel):
    numero: str
    bloco: Optional[str] = None
    tipo: TipoApartamento = TipoApartamento.padrao
    fracao_ideal: Optional[float] = None
    metragem: Optional[float] = None
    vaga_demarcada: Optional[str] = None
    status: StatusApartamento = StatusApartamento.vazio


class ApartamentoUpdate(BaseModel):
    numero: Optional[str] = None
    bloco: Optional[str] = None
    tipo: Optional[TipoApartamento] = None
    fracao_ideal: Optional[float] = None
    metragem: Optional[float] = None
    vaga_demarcada: Optional[str] = None
    status: Optional[StatusApartamento] = None


class ApartamentoResponse(BaseModel):
    id: UUID
    numero: str
    bloco: Optional[str]
    tipo: TipoApartamento
    fracao_ideal: Optional[float]
    metragem: Optional[float]
    vaga_demarcada: Optional[str]
    status: StatusApartamento
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApartamentoListResponse(BaseModel):
    id: UUID
    numero: str
    bloco: Optional[str]
    tipo: TipoApartamento
    status: StatusApartamento

    class Config:
        from_attributes = True
