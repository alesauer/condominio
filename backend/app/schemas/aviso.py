from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional
from uuid import UUID


class AvisoCreate(BaseModel):
    titulo: str
    descricao: str
    prioridade: Optional[str] = "baixa"
    enviar_email: Optional[bool] = False


class AvisoUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    prioridade: Optional[str] = None
    enviar_email: Optional[bool] = None


class AvisoResponse(BaseModel):
    id: UUID
    titulo: str
    descricao: str
    prioridade: str
    data_publicacao: date
    enviar_email: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
