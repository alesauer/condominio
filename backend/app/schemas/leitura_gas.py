from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


class LeituraGasCreate(BaseModel):
    apartamento_id: UUID
    competencia: date
    leitura_atual: float
    leitura_anterior: Optional[float] = None
    valor_unitario: Optional[float] = None
    observacao: Optional[str] = None


class LeituraGasLoteCreate(BaseModel):
    competencia: date
    leituras: List[LeituraGasCreate]


class LeituraGasPlanilhaItem(BaseModel):
    apartamento_id: UUID
    apartamento_numero: str
    apartamento_bloco: Optional[str] = None
    leitura_anterior: Optional[float] = None
    leitura_atual: Optional[float] = None
    consumo: Optional[float] = None
    valor_unitario: Optional[float] = None
    valor_cobrado: Optional[float] = None
    observacao: Optional[str] = None
    leitura_id: Optional[UUID] = None


class LeituraGasPlanilhaResponse(BaseModel):
    competencia: date
    competencia_formatada: str
    valor_unitario_padrao: float
    total_consumo_m3: float
    total_valor_cobrado: float
    itens: List[LeituraGasPlanilhaItem]


class LeituraGasItemSalvar(BaseModel):
    apartamento_id: UUID
    leitura_anterior: Optional[float] = None
    leitura_atual: Optional[float] = None
    valor_unitario: Optional[float] = None
    observacao: Optional[str] = None


class LeituraGasSalvarLotePayload(BaseModel):
    competencia: date
    valor_unitario_padrao: Optional[float] = None
    leituras: List[LeituraGasItemSalvar]


class LeituraGasResponse(BaseModel):
    id: UUID
    apartamento_id: UUID
    apartamento_numero: Optional[str] = None
    competencia: date
    leitura_anterior: Optional[float]
    leitura_atual: float
    consumo: Optional[float]
    valor_unitario: Optional[float]
    valor_cobrado: Optional[float]
    observacao: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
