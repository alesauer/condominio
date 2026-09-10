from sqlalchemy import Column, String, Numeric, Date, Text, Enum as SQLEnum, Boolean, Integer
from sqlalchemy.orm import relationship, selectinload
from app.core.database import Base
from app.models.base import BaseModelMixin
from app.models.receita import StatusFinanceiro
import enum


class TipoDespesa(str, enum.Enum):
    ordinaria = "ordinaria"
    extraordinaria = "extraordinaria"


class Despesa(Base, BaseModelMixin):
    __tablename__ = "despesas"

    descricao = Column(String(500), nullable=False)
    tipo = Column(SQLEnum(TipoDespesa), nullable=False, default=TipoDespesa.ordinaria, index=True)
    categoria = Column(String(100), nullable=True)
    valor = Column(Numeric(12, 2), nullable=False, default=0)
    competencia = Column(Date, nullable=False, index=True)
    vencimento = Column(Date, nullable=True)
    data_pagamento = Column(Date, nullable=True)
    status = Column(SQLEnum(StatusFinanceiro), nullable=False, default=StatusFinanceiro.pendente, index=True)
    observacao = Column(Text, nullable=True)
    comprovante_url = Column(String(500), nullable=True)
    comprovante_nome = Column(String(255), nullable=True)
    parcelamento = Column(Boolean, nullable=False, default=False)
    total_parcelas = Column(Integer, nullable=True)

    parcelas = relationship("DespesaParcela", back_populates="despesa", cascade="all, delete-orphan", lazy="selectin")

