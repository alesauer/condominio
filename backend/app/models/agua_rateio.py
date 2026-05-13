from sqlalchemy import Column, Numeric, Date, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class AguaRateio(Base, BaseModelMixin):
    __tablename__ = "agua_rateios"

    competencia = Column(Date, nullable=False, unique=True)
    valor_total = Column(Numeric(12, 2), nullable=False)
    observacao = Column(Text, nullable=True)

    apartamentos = relationship("AguaRateioApartamento", back_populates="rateio", cascade="all, delete-orphan")
