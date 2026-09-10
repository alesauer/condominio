from datetime import datetime, date
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, field_validator, model_validator
from app.models.morador import TipoMorador


class ApartamentoVinculoInfo(BaseModel):
    apartamento_id: UUID
    numero: str
    bloco: Optional[str] = None
    tipo_vinculo: str = "residente"  # "proprietario" ou "residente"
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None

    class Config:
        from_attributes = True


class MoradorCreate(BaseModel):
    nome: str
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    veiculo: Optional[str] = None
    tipo: TipoMorador = TipoMorador.morador
    apartamento_id: Optional[UUID] = None

    @field_validator("apartamento_id", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v


class MoradorUpdate(BaseModel):
    nome: Optional[str] = None
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    veiculo: Optional[str] = None
    tipo: Optional[TipoMorador] = None
    apartamento_id: Optional[UUID] = None

    @field_validator("apartamento_id", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v


class MoradorResponse(BaseModel):
    id: UUID
    nome: str
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    veiculo: Optional[str] = None
    tipo: TipoMorador
    apartamentos: List[ApartamentoVinculoInfo] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def extract_relationships(cls, data: Any):
        if hasattr(data, "id") and hasattr(data, "nome"):
            vinculos = []
            if hasattr(data, "apartamentos_proprietario") and data.apartamentos_proprietario:
                for apto in data.apartamentos_proprietario:
                    vinculos.append({
                        "apartamento_id": apto.id,
                        "numero": apto.numero,
                        "bloco": apto.bloco,
                        "tipo_vinculo": "proprietario",
                    })
            if hasattr(data, "apartamentos") and data.apartamentos:
                for am in data.apartamentos:
                    if getattr(am, "apartamento", None):
                        if not any(v["apartamento_id"] == am.apartamento.id and v["tipo_vinculo"] == "proprietario" for v in vinculos):
                            vinculos.append({
                                "apartamento_id": am.apartamento.id,
                                "numero": am.apartamento.numero,
                                "bloco": am.apartamento.bloco,
                                "tipo_vinculo": "residente",
                                "data_inicio": am.data_inicio,
                                "data_fim": am.data_fim,
                            })
            return {
                "id": data.id,
                "nome": data.nome,
                "cpf": data.cpf,
                "telefone": data.telefone,
                "email": data.email,
                "veiculo": data.veiculo,
                "tipo": data.tipo,
                "apartamentos": vinculos,
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
        return data


class VincularApartamento(BaseModel):
    apartamento_id: UUID
    tipo_vinculo: Optional[str] = "residente"  # "proprietario" | "residente"
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
