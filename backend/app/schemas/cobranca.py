from datetime import datetime, date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from app.models.receita import StatusFinanceiro


class CobrancaResponse(BaseModel):
    id: UUID
    apartamento_id: UUID
    descricao: str
    competencia: date
    vencimento: date
    valor: float
    multa: Optional[float]
    juros: Optional[float]
    valor_total: float
    data_pagamento: Optional[date]
    status: StatusFinanceiro
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
