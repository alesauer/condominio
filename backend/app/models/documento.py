from sqlalchemy import Column, String, Text, BigInteger, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin
import enum


class CategoriaDocumento(str, enum.Enum):
    atas = "atas"
    boletos = "boletos"
    comprovantes = "comprovantes"
    contratos = "contratos"
    convencao = "convencao"
    outros = "outros"
    # Aliases
    ata = "atas"
    boleto = "boletos"
    comprovante = "comprovantes"
    contrato = "contratos"



class Documento(Base, BaseModelMixin):
    __tablename__ = "documentos"

    nome = Column(String(500), nullable=False)
    descricao = Column(Text, nullable=True)
    categoria = Column(SQLEnum(CategoriaDocumento), nullable=False, default=CategoriaDocumento.outros, index=True)
    caminho_arquivo = Column(String(1000), nullable=False)
    tamanho_bytes = Column(BigInteger, nullable=True)
    tipo_mime = Column(String(100), nullable=True)
    apartamento_id = Column(UUID(as_uuid=True), ForeignKey("apartamentos.id", ondelete="SET NULL"), nullable=True, index=True)

    apartamento = relationship("Apartamento")
