from sqlalchemy import Column, Numeric, Date, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class LeituraGas(Base, BaseModelMixin):
    __tablename__ = "leituras_gas"

    apartamento_id = Column(UUID(as_uuid=True), ForeignKey("apartamentos.id", ondelete="CASCADE"), nullable=False, index=True)
    competencia = Column(Date, nullable=False, index=True)
    leitura_anterior = Column(Numeric(10, 2), nullable=True)
    leitura_atual = Column(Numeric(10, 2), nullable=False)
    consumo = Column(Numeric(10, 2), nullable=True)
    valor_unitario = Column(Numeric(8, 4), nullable=True)
    valor_cobrado = Column(Numeric(12, 2), nullable=True)
    observacao = Column(Text, nullable=True)

    apartamento = relationship("Apartamento", back_populates="leituras_gas")
