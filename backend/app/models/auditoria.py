from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.base import BaseModelMixin


class Auditoria(Base):
    __tablename__ = "auditoria"

    id = Column(UUID(as_uuid=True), primary_key=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)
    usuario_nome = Column(String(255), nullable=True)
    acao = Column(String(50), nullable=False)
    entidade_tipo = Column(String(50), nullable=False)
    entidade_id = Column(UUID(as_uuid=True), nullable=True)
    dados_anteriores = Column(JSONB, nullable=True)
    dados_novos = Column(JSONB, nullable=True)
    ip_origem = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    usuario = relationship("Usuario")
