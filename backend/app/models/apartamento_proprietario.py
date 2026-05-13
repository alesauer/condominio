from sqlalchemy import Column, String, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class ApartamentoProprietario(Base, BaseModelMixin):
    __tablename__ = "apartamento_proprietarios"

    apartamento_id = Column(UUID(as_uuid=True), ForeignKey("apartamentos.id", ondelete="CASCADE"), nullable=False)
    proprietario_id = Column(UUID(as_uuid=True), ForeignKey("proprietarios.id", ondelete="CASCADE"), nullable=False)

    apartamento = relationship("Apartamento", back_populates="proprietarios")
    proprietario = relationship("Proprietario", back_populates="apartamentos")
