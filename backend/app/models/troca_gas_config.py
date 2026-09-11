from sqlalchemy import Column, String, Text, Date
from app.core.database import Base
from app.models.base import BaseModelMixin


class TrocaGasConfig(Base, BaseModelMixin):
    __tablename__ = "troca_gas_config"

    competencia = Column(Date, nullable=True, index=True)
    ultima_troca = Column(String(50), nullable=True)
    previsao_proxima_troca = Column(String(50), nullable=True)
    observacao = Column(Text, nullable=True)
