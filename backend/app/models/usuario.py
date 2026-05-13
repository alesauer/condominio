from sqlalchemy import Column, String, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin
import enum


class RoleUsuario(str, enum.Enum):
    admin = "admin"
    morador = "morador"
    proprietario = "proprietario"


class Usuario(Base, BaseModelMixin):
    __tablename__ = "usuarios"

    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    senha_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(RoleUsuario), nullable=False, default=RoleUsuario.morador)
    ativo = Column(Boolean, nullable=False, default=True)

    tokens_refresh = relationship("TokenRefresh", back_populates="usuario", cascade="all, delete-orphan")
