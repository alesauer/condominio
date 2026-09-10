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
    is_responsavel: bool = False
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
    definir_como_responsavel: Optional[bool] = False

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
    definir_como_responsavel: Optional[bool] = False

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
            vinculos_map = {}
            responsavel_apto_ids = set()

            if hasattr(data, "apartamentos_responsavel") and data.apartamentos_responsavel:
                for apto in data.apartamentos_responsavel:
                    responsavel_apto_ids.add(apto.id)

            if hasattr(data, "apartamentos_proprietario") and data.apartamentos_proprietario:
                for apto in data.apartamentos_proprietario:
                    vinculos_map[apto.id] = {
                        "apartamento_id": apto.id,
                        "numero": apto.numero,
                        "bloco": apto.bloco,
                        "tipo_vinculo": "proprietario",
                        "is_responsavel": apto.id in responsavel_apto_ids or getattr(apto, "responsavel_id", None) == data.id,
                    }

            if hasattr(data, "apartamentos") and data.apartamentos:
                for am in data.apartamentos:
                    if getattr(am, "apartamento", None):
                        apto = am.apartamento
                        if apto.id not in vinculos_map:
                            vinculos_map[apto.id] = {
                                "apartamento_id": apto.id,
                                "numero": apto.numero,
                                "bloco": apto.bloco,
                                "tipo_vinculo": "residente",
                                "is_responsavel": apto.id in responsavel_apto_ids or getattr(apto, "responsavel_id", None) == data.id,
                                "data_inicio": am.data_inicio,
                                "data_fim": am.data_fim,
                            }
                        else:
                            # Se já estava em vinculos como proprietário, garante que is_responsavel está atualizado
                            if apto.id in responsavel_apto_ids or getattr(apto, "responsavel_id", None) == data.id:
                                vinculos_map[apto.id]["is_responsavel"] = True

            # Se morador é responsável por um apto mas não estava nem como dono nem na lista de residentes
            if hasattr(data, "apartamentos_responsavel") and data.apartamentos_responsavel:
                for apto in data.apartamentos_responsavel:
                    if apto.id not in vinculos_map:
                        vinculos_map[apto.id] = {
                            "apartamento_id": apto.id,
                            "numero": apto.numero,
                            "bloco": apto.bloco,
                            "tipo_vinculo": "residente",
                            "is_responsavel": True,
                        }

            return {
                "id": data.id,
                "nome": data.nome,
                "cpf": data.cpf,
                "telefone": data.telefone,
                "email": data.email,
                "veiculo": data.veiculo,
                "tipo": data.tipo,
                "apartamentos": list(vinculos_map.values()),
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
        return data


class VincularApartamento(BaseModel):
    apartamento_id: UUID
    tipo_vinculo: Optional[str] = "residente"  # "proprietario" | "residente"
    definir_como_responsavel: Optional[bool] = False
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
