from datetime import datetime, date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from app.models.receita import TipoReceita, StatusFinanceiro


class ReceitaCreate(BaseModel):
    descricao: str
    tipo: TipoReceita = TipoReceita.condominio
    categoria: Optional[str] = None
    valor: float
    competencia: date
    vencimento: Optional[date] = None
    data_recebimento: Optional[date] = None
    status: StatusFinanceiro = StatusFinanceiro.pendente
    observacao: Optional[str] = None
    comprovante_url: Optional[str] = None
    comprovante_nome: Optional[str] = None
    apartamento_id: Optional[UUID] = None
    recorrente: bool = False
    meses_recorrencia: Optional[int] = None


class ReceitaUpdate(BaseModel):
    descricao: Optional[str] = None
    tipo: Optional[TipoReceita] = None
    categoria: Optional[str] = None
    valor: Optional[float] = None
    competencia: Optional[date] = None
    vencimento: Optional[date] = None
    data_recebimento: Optional[date] = None
    status: Optional[StatusFinanceiro] = None
    observacao: Optional[str] = None
    comprovante_url: Optional[str] = None
    comprovante_nome: Optional[str] = None


class ReceitaResponse(BaseModel):
    id: UUID
    descricao: str
    tipo: TipoReceita
    categoria: Optional[str]
    valor: float
    competencia: date
    vencimento: Optional[date]
    data_recebimento: Optional[date]
    status: StatusFinanceiro
    observacao: Optional[str]
    comprovante_url: Optional[str] = None
    comprovante_nome: Optional[str] = None
    apartamento_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
