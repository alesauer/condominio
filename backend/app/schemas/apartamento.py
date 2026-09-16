from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, field_validator
from app.models.apartamento import TipoApartamento, StatusApartamento


class ProprietarioResumo(BaseModel):
    id: UUID
    nome: str
    telefone: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


class ApartamentoCreate(BaseModel):
    numero: str
    bloco: Optional[str] = None
    tipo: TipoApartamento = TipoApartamento.padrao
    fracao_ideal: Optional[float] = None
    metragem: Optional[float] = None
    vaga_demarcada: Optional[str] = None
    status: StatusApartamento = StatusApartamento.vazio
    proprietario_id: Optional[UUID] = None
    responsavel_id: Optional[UUID] = None

    @field_validator("proprietario_id", "responsavel_id", mode="before")
    @classmethod
    def empty_uuid_to_none(cls, v):
        if v == "" or v == "none" or v is None:
            return None
        return v

    @field_validator("bloco", "vaga_demarcada", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "":
            return None
        return v

    @field_validator("fracao_ideal", "metragem", mode="before")
    @classmethod
    def empty_float_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v


class ApartamentoUpdate(BaseModel):
    numero: Optional[str] = None
    bloco: Optional[str] = None
    tipo: Optional[TipoApartamento] = None
    fracao_ideal: Optional[float] = None
    metragem: Optional[float] = None
    vaga_demarcada: Optional[str] = None
    status: Optional[StatusApartamento] = None
    proprietario_id: Optional[UUID] = None
    responsavel_id: Optional[UUID] = None

    @field_validator("proprietario_id", "responsavel_id", mode="before")
    @classmethod
    def empty_uuid_to_none(cls, v):
        if v == "" or v == "none" or v is None:
            return None
        return v

    @field_validator("bloco", "vaga_demarcada", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "":
            return None
        return v

    @field_validator("fracao_ideal", "metragem", mode="before")
    @classmethod
    def empty_float_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v


class ApartamentoResponse(BaseModel):
    id: UUID
    numero: str
    bloco: Optional[str]
    tipo: TipoApartamento
    fracao_ideal: Optional[float]
    metragem: Optional[float]
    vaga_demarcada: Optional[str]
    status: StatusApartamento
    proprietario_id: Optional[UUID]
    proprietario: Optional[ProprietarioResumo] = None
    responsavel_id: Optional[UUID] = None
    responsavel: Optional[ProprietarioResumo] = None
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
    proprietario_id: Optional[UUID]
    proprietario: Optional[ProprietarioResumo] = None
    responsavel_id: Optional[UUID] = None
    responsavel: Optional[ProprietarioResumo] = None

    class Config:
        from_attributes = True
