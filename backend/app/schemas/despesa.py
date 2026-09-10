from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel
from app.models.despesa import TipoDespesa
from app.models.receita import StatusFinanceiro


class DespesaParcelaCreate(BaseModel):
    numero_parcela: int
    valor: float
    competencia: date
    vencimento: Optional[date] = None


class DespesaCreate(BaseModel):
    descricao: str
    tipo: TipoDespesa = TipoDespesa.ordinaria
    categoria: Optional[str] = None
    valor: float
    competencia: date
    vencimento: Optional[date] = None
    data_pagamento: Optional[date] = None
    status: StatusFinanceiro = StatusFinanceiro.pendente
    observacao: Optional[str] = None
    comprovante_url: Optional[str] = None
    comprovante_nome: Optional[str] = None
    parcelamento: bool = False
    total_parcelas: Optional[int] = None
    recorrente: bool = False
    meses_recorrencia: Optional[int] = None


class DespesaUpdate(BaseModel):
    descricao: Optional[str] = None
    tipo: Optional[TipoDespesa] = None
    categoria: Optional[str] = None
    valor: Optional[float] = None
    competencia: Optional[date] = None
    vencimento: Optional[date] = None
    data_pagamento: Optional[date] = None
    status: Optional[StatusFinanceiro] = None
    observacao: Optional[str] = None
    comprovante_url: Optional[str] = None
    comprovante_nome: Optional[str] = None


class DespesaParcelaResponse(BaseModel):
    id: UUID
    despesa_id: UUID
    numero_parcela: int
    valor: float
    competencia: date
    vencimento: Optional[date]
    status: StatusFinanceiro
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DespesaResponse(BaseModel):
    id: UUID
    descricao: str
    tipo: TipoDespesa
    categoria: Optional[str]
    valor: float
    competencia: date
    vencimento: Optional[date]
    data_pagamento: Optional[date]
    status: StatusFinanceiro
    observacao: Optional[str]
    comprovante_url: Optional[str] = None
    comprovante_nome: Optional[str] = None
    parcelamento: bool
    total_parcelas: Optional[int]
    parcelas: List[DespesaParcelaResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
