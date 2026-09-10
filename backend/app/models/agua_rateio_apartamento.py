from typing import Optional
from sqlalchemy import Column, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class AguaRateioApartamento(Base, BaseModelMixin):
    __tablename__ = "agua_rateio_apartamentos"

    rateio_id = Column(UUID(as_uuid=True), ForeignKey("agua_rateios.id", ondelete="CASCADE"), nullable=False, index=True)
    apartamento_id = Column(UUID(as_uuid=True), ForeignKey("apartamentos.id", ondelete="CASCADE"), nullable=False, index=True)
    peso = Column(Numeric(8, 4), nullable=False)
    soma_pesos = Column(Numeric(10, 4), nullable=False)
    valor_calculado = Column(Numeric(12, 2), nullable=False)

    rateio = relationship("AguaRateio", back_populates="apartamentos")
    apartamento = relationship("Apartamento", back_populates="agua_rateios")

    @property
    def apartamento_numero(self) -> Optional[str]:
        return self.apartamento.numero if self.apartamento else None

    @property
    def apartamento_bloco(self) -> Optional[str]:
        return self.apartamento.bloco if self.apartamento else None

    @property
    def apartamento_tipo(self) -> Optional[str]:
        if not self.apartamento or not self.apartamento.tipo:
            return None
        return str(self.apartamento.tipo.value) if hasattr(self.apartamento.tipo, "value") else str(self.apartamento.tipo)

    @property
    def fracao_ideal(self) -> Optional[float]:
        if self.apartamento and self.apartamento.fracao_ideal is not None:
            return float(self.apartamento.fracao_ideal)
        return float(self.peso) if self.peso is not None else None
