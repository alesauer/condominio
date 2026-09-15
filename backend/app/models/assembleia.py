from sqlalchemy import Column, String, Date, Text, Time
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class Assembleia(Base, BaseModelMixin):
    __tablename__ = "assembleias"

    data = Column(Date, nullable=False, index=True)
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    local = Column(String(255), nullable=True)
    hora_inicio = Column(Time, nullable=True)
    hora_fim = Column(Time, nullable=True)

    pautas = relationship("Pauta", back_populates="assembleia", cascade="all, delete-orphan", passive_deletes=True, order_by="Pauta.ordem")
    ata = relationship("Ata", back_populates="assembleia", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
