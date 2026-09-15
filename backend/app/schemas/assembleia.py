from pydantic import BaseModel, ConfigDict
from datetime import date, time, datetime
from typing import Optional, List
from uuid import UUID


class PautaCreate(BaseModel):
    ordem: int
    descricao: str


class PautaResponse(BaseModel):
    id: UUID
    assembleia_id: UUID
    ordem: int
    descricao: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AtaCreate(BaseModel):
    conteudo: Optional[str] = None


class AtaResponse(BaseModel):
    id: UUID
    assembleia_id: UUID
    conteudo: Optional[str] = None
    arquivo_path: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AssembleiaCreate(BaseModel):
    data: date
    titulo: str
    descricao: Optional[str] = None
    local: Optional[str] = None
    hora_inicio: Optional[str] = None
    hora_fim: Optional[str] = None
    pautas: List[PautaCreate] = []
    ata_conteudo: Optional[str] = None


class AssembleiaUpdate(BaseModel):
    data: Optional[date] = None
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    local: Optional[str] = None
    hora_inicio: Optional[str] = None
    hora_fim: Optional[str] = None
    pautas: Optional[List[PautaCreate]] = None
    ata_conteudo: Optional[str] = None


class AssembleiaResponse(BaseModel):
    id: UUID
    data: date
    titulo: str
    descricao: Optional[str] = None
    local: Optional[str] = None
    hora_inicio: Optional[time] = None
    hora_fim: Optional[time] = None
    pautas: List[PautaResponse] = []
    ata: Optional[AtaResponse] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
