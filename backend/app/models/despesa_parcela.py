from sqlalchemy import Column, Integer, Numeric, Date, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin
from app.models.receita import StatusFinanceiro


class DespesaParcela(Base, BaseModelMixin):
    __tablename__ = "despesa_parcelas"

    despesa_id = Column(UUID(as_uuid=True), ForeignKey("despesas.id", ondelete="CASCADE"), nullable=False, index=True)
    numero_parcela = Column(Integer, nullable=False)
    valor = Column(Numeric(12, 2), nullable=False)
    competencia = Column(Date, nullable=False, index=True)
    vencimento = Column(Date, nullable=True)
    status = Column(SQLEnum(StatusFinanceiro), nullable=False, default=StatusFinanceiro.pendente)

    despesa = relationship("Despesa", back_populates="parcelas")
