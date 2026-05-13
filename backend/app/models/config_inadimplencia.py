from sqlalchemy import Column, Numeric, Integer
from app.core.database import Base
from app.models.base import BaseModelMixin


class ConfigInadimplencia(Base, BaseModelMixin):
    __tablename__ = "config_inadimplencia"

    percentual_multa = Column(Numeric(5, 2), nullable=False, default=2.00)
    percentual_juros_mes = Column(Numeric(5, 2), nullable=False, default=1.00)
    dias_tolerancia = Column(Integer, nullable=False, default=5)
