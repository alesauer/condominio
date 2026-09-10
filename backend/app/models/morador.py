from sqlalchemy import Column, String, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin
import enum


class TipoMorador(str, enum.Enum):
    proprietario = "proprietario"
    inquilino = "inquilino"
    morador = "morador"
    dependente = "dependente"


class Morador(Base, BaseModelMixin):
    __tablename__ = "moradores"

    nome = Column(String(255), nullable=False)
    cpf = Column(String(14), unique=True, nullable=True, index=True)
    telefone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    veiculo = Column(String(100), nullable=True)
    tipo = Column(SQLEnum(TipoMorador), nullable=False, default=TipoMorador.morador)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)

    usuario = relationship("Usuario")
    apartamentos = relationship("ApartamentoMorador", back_populates="morador", cascade="all, delete-orphan")
    apartamentos_proprietario = relationship("Apartamento", back_populates="proprietario", foreign_keys="Apartamento.proprietario_id")
    apartamentos_responsavel = relationship("Apartamento", back_populates="responsavel", foreign_keys="Apartamento.responsavel_id")
