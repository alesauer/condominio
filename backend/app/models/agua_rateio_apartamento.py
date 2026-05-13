from sqlalchemy import Column, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class AguaRateioApartamento(Base, BaseModelMixin):
    __tablename__ = "agua_rateio_apartamentos"

    rateio_id = Column(UUID(as_uuid=True), ForeignKey("agua_rateios.id", ondelete="CASCADE"), nullable=False, index=True)
    apartamento_id = Column(UUID(as_uuid=True), ForeignKey("apartamentos.id", ondelete="CASCADE"), nullable=False, index=True)
    peso = Column(Numeric(5, 2), nullable=False)
    soma_pesos = Column(Numeric(10, 2), nullable=False)
    valor_calculado = Column(Numeric(12, 2), nullable=False)

    rateio = relationship("AguaRateio", back_populates="apartamentos")
    apartamento = relationship("Apartamento", back_populates="agua_rateios")
