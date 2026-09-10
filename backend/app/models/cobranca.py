from sqlalchemy import Column, String, Numeric, Date, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin
from app.models.receita import StatusFinanceiro


class Cobranca(Base, BaseModelMixin):
    __tablename__ = "cobrancas"

    apartamento_id = Column(UUID(as_uuid=True), ForeignKey("apartamentos.id", ondelete="CASCADE"), nullable=False, index=True)
    descricao = Column(String(500), nullable=False)
    competencia = Column(Date, nullable=False, index=True)
    vencimento = Column(Date, nullable=False, index=True)
    valor = Column(Numeric(12, 2), nullable=False, default=0)
    multa = Column(Numeric(12, 2), default=0)
    juros = Column(Numeric(12, 2), default=0)
    valor_total = Column(Numeric(12, 2), nullable=False, default=0)
    data_pagamento = Column(Date, nullable=True)
    status = Column(SQLEnum(StatusFinanceiro), nullable=False, default=StatusFinanceiro.pendente, index=True)
    receita_id = Column(UUID(as_uuid=True), ForeignKey("receitas.id", ondelete="SET NULL"), nullable=True)

    apartamento = relationship("Apartamento", back_populates="cobrancas")
    receita = relationship("Receita")

    @property
    def apartamento_numero(self) -> str | None:
        return self.apartamento.numero if self.apartamento else None

    @property
    def apartamento_bloco(self) -> str | None:
        return self.apartamento.bloco if self.apartamento else None

