from sqlalchemy import Column, String, Numeric, Date, Text, Enum as SQLEnum, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin
import enum


class TipoReceita(str, enum.Enum):
    condominio = "condominio"
    fundo_reserva = "fundo_reserva"
    taxa_extra = "taxa_extra"


class StatusFinanceiro(str, enum.Enum):
    pendente = "pendente"
    pago = "pago"
    atrasado = "atrasado"
    cancelado = "cancelado"


class Receita(Base, BaseModelMixin):
    __tablename__ = "receitas"

    descricao = Column(String(500), nullable=False)
    tipo = Column(SQLEnum(TipoReceita), nullable=False, default=TipoReceita.condominio)
    categoria = Column(String(100), nullable=True)
    valor = Column(Numeric(12, 2), nullable=False, default=0)
    competencia = Column(Date, nullable=False, index=True)
    vencimento = Column(Date, nullable=True)
    data_recebimento = Column(Date, nullable=True)
    status = Column(SQLEnum(StatusFinanceiro), nullable=False, default=StatusFinanceiro.pendente, index=True)
    observacao = Column(Text, nullable=True)
    comprovante_url = Column(String(500), nullable=True)
    comprovante_nome = Column(String(255), nullable=True)
    apartamento_id = Column(UUID(as_uuid=True), ForeignKey("apartamentos.id", ondelete="SET NULL"), nullable=True)

    apartamento = relationship("Apartamento")
