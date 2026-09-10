from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


class AguaRateioCreate(BaseModel):
    competencia: date
    valor_total: float
    observacao: Optional[str] = None


class AguaRateioApartamentoResponse(BaseModel):
    id: UUID
    apartamento_id: UUID
    peso: float
    soma_pesos: float
    valor_calculado: float
    apartamento_numero: Optional[str] = None
    apartamento_bloco: Optional[str] = None
    apartamento_tipo: Optional[str] = None
    fracao_ideal: Optional[float] = None

    class Config:
        from_attributes = True


class AguaRateioResponse(BaseModel):
    id: UUID
    competencia: date
    valor_total: float
    observacao: Optional[str]
    apartamentos: List[AguaRateioApartamentoResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
