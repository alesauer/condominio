from sqlalchemy import Column, Text, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModelMixin


class Ata(Base, BaseModelMixin):
    __tablename__ = "atas"

    assembleia_id = Column(UUID(as_uuid=True), ForeignKey("assembleias.id", ondelete="CASCADE"), nullable=False, unique=True)
    conteudo = Column(Text, nullable=True)
    arquivo_path = Column(String(500), nullable=True)

    assembleia = relationship("Assembleia", back_populates="ata")
