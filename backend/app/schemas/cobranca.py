from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field
from app.models.receita import StatusFinanceiro


class CobrancaResponse(BaseModel):
    id: UUID
    apartamento_id: UUID
    descricao: str
    competencia: date
    vencimento: date
    valor: float
    multa: Optional[float] = 0.0
    juros: Optional[float] = 0.0
    valor_total: float
    data_pagamento: Optional[date] = None
    status: StatusFinanceiro
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CobrancaGerarMensal(BaseModel):
    competencia: date
    vencimento: date
    valor_base_condominio: float = Field(ge=0, description="Valor base da taxa de condomínio por apartamento")
    incluir_agua: bool = Field(default=True, description="Incluir rateio de água da competência se apurado")
    incluir_gas: bool = Field(default=True, description="Incluir consumo de gás da competência se apurado")
    descricao: Optional[str] = Field(default=None, description="Descrição do lançamento (opcional)")


class CobrancaGerarMensalResult(BaseModel):
    geradas: int
    total_valor: float
    competencia: date
    cobrancas: List[CobrancaResponse]
