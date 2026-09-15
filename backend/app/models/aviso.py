from sqlalchemy import Column, String, Text, Date, Boolean, Enum as SQLEnum
from app.core.database import Base
from app.models.base import BaseModelMixin
import enum


class PrioridadeAviso(str, enum.Enum):
    baixa = "baixa"
    media = "media"
    alta = "alta"
    urgente = "urgente"


class Aviso(Base, BaseModelMixin):
    __tablename__ = "avisos"

    titulo = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=False)
    prioridade = Column(
        SQLEnum(PrioridadeAviso, name="prioridadeaviso", create_type=False, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=PrioridadeAviso.baixa,
    )
    data_publicacao = Column(Date, nullable=False, index=True)
    enviar_email = Column(Boolean, nullable=False, default=False)

