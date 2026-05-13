from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class Proprietario(Base, BaseModelMixin):
    __tablename__ = "proprietarios"

    nome = Column(String(255), nullable=False)
    cpf = Column(String(14), unique=True, nullable=False, index=True)
    telefone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)

    usuario = relationship("Usuario")
    apartamentos = relationship("ApartamentoProprietario", back_populates="proprietario", cascade="all, delete-orphan")
