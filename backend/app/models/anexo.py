from sqlalchemy import Column, String, BigInteger, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import BaseModelMixin


class Anexo(Base, BaseModelMixin):
    __tablename__ = "anexos"

    entidade_tipo = Column(String(50), nullable=False, index=True)
    entidade_id = Column(UUID(as_uuid=True), nullable=False)
    nome = Column(String(500), nullable=False)
    caminho_arquivo = Column(String(1000), nullable=False)
    tamanho_bytes = Column(BigInteger, nullable=True)
    tipo_mime = Column(String(100), nullable=True)
