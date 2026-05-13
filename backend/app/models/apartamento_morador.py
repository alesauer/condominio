from sqlalchemy import Column, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class ApartamentoMorador(Base, BaseModelMixin):
    __tablename__ = "apartamento_moradores"

    apartamento_id = Column(UUID(as_uuid=True), ForeignKey("apartamentos.id", ondelete="CASCADE"), nullable=False)
    morador_id = Column(UUID(as_uuid=True), ForeignKey("moradores.id", ondelete="CASCADE"), nullable=False)
    data_inicio = Column(Date, nullable=False)
    data_fim = Column(Date, nullable=True)

    apartamento = relationship("Apartamento", back_populates="moradores")
    morador = relationship("Morador", back_populates="apartamentos")
