from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field
from app.models.receita import StatusFinanceiro


class CobrancaResponse(BaseModel):
    id: UUID
    apartamento_id: UUID
    apartamento_numero: Optional[str] = None
    apartamento_bloco: Optional[str] = None
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
    valor_base_condominio: float = Field(default=0.0, ge=0, description="Valor base / fundo de reserva adicional (opcional)")
    incluir_despesas: bool = Field(default=True, description="Somar despesas do mês e ratear por fração ideal")
    incluir_agua: bool = Field(default=True, description="Incluir rateio de água da competência se apurado")
    incluir_gas: bool = Field(default=True, description="Incluir consumo de gás da competência se apurado")
    descricao: Optional[str] = Field(default=None, description="Descrição personalizada do lançamento (opcional)")


class CobrancaPreviaApartamento(BaseModel):
    apartamento_id: UUID
    apartamento_numero: str
    apartamento_bloco: Optional[str] = None
    apartamento_tipo: Optional[str] = None
    fracao_ideal: float
    valor_despesas: float = 0.0
    valor_agua: float = 0.0
    valor_gas: float = 0.0
    valor_base: float = 0.0
    valor_total: float = 0.0
    ja_gerado: bool = False


class CobrancaPreviaResult(BaseModel):
    competencia: date
    vencimento: date
    total_despesas_mes: float = 0.0
    total_agua: float = 0.0
    total_gas: float = 0.0
    total_base: float = 0.0
    total_geral: float = 0.0
    apartamentos: List[CobrancaPreviaApartamento] = []


class CobrancaGerarMensalResult(BaseModel):
    geradas: int
    total_despesas_mes: Optional[float] = 0.0
    total_agua: Optional[float] = 0.0
    total_gas: Optional[float] = 0.0
    total_base: Optional[float] = 0.0
    total_valor: float
    competencia: date
    cobrancas: List[CobrancaResponse]

