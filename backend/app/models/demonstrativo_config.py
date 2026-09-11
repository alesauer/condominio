from sqlalchemy import Column, String, Text, Date
from app.core.database import Base
from app.models.base import BaseModelMixin


class DemonstrativoConfig(Base, BaseModelMixin):
    __tablename__ = "demonstrativo_config"

    competencia = Column(Date, nullable=True, index=True)
    mensagem_vencimento = Column(Text, nullable=True)
