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


class LeituraGasResponse(BaseModel):
    id: UUID
    apartamento_id: UUID
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
