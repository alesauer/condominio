from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class Pauta(Base, BaseModelMixin):
    __tablename__ = "pautas"

    assembleia_id = Column(UUID(as_uuid=True), ForeignKey("assembleias.id", ondelete="CASCADE"), nullable=False)
    ordem = Column(Integer, nullable=False)
    descricao = Column(Text, nullable=False)

    assembleia = relationship("Assembleia", back_populates="pautas")
