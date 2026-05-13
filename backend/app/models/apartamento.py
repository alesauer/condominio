from sqlalchemy import Column, String, Numeric, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin
import enum


class TipoApartamento(str, enum.Enum):
    padrao = "padrao"
    area_privativa = "area_privativa"
    cobertura = "cobertura"


class StatusApartamento(str, enum.Enum):
    ocupado = "ocupado"
    vazio = "vazio"
    alugado = "alugado"


class Apartamento(Base, BaseModelMixin):
    __tablename__ = "apartamentos"

    numero = Column(String(20), nullable=False)
    bloco = Column(String(20), nullable=True)
    tipo = Column(SQLEnum(TipoApartamento), nullable=False, default=TipoApartamento.padrao)
    fracao_ideal = Column(Numeric(8, 4), nullable=True)
    metragem = Column(Numeric(8, 2), nullable=True)
    vaga_demarcada = Column(String(50), nullable=True)
    status = Column(SQLEnum(StatusApartamento), nullable=False, default=StatusApartamento.vazio)

    proprietarios = relationship("ApartamentoProprietario", back_populates="apartamento", cascade="all, delete-orphan")
    moradores = relationship("ApartamentoMorador", back_populates="apartamento", cascade="all, delete-orphan")
    cobrancas = relationship("Cobranca", back_populates="apartamento", cascade="all, delete-orphan")
    leituras_gas = relationship("LeituraGas", back_populates="apartamento", cascade="all, delete-orphan")
    agua_rateios = relationship("AguaRateioApartamento", back_populates="apartamento", cascade="all, delete-orphan")
