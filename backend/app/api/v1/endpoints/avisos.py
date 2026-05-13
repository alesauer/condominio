from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.permissions import admin_required
from app.models.aviso import Aviso
from app.utils.pagination import paginate
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from uuid import UUID

router = APIRouter()


class AvisoCreate(BaseModel):
    titulo: str; descricao: str; prioridade: str = "baixa"; enviar_email: bool = False
class AvisoResponse(BaseModel):
    id: UUID; titulo: str; descricao: str; prioridade: str; data_publicacao: date; enviar_email: bool; created_at: datetime; updated_at: datetime
    class Config: from_attributes = True

@router.get("", response_model=dict)
async def list_avisos(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    query = select(Aviso).order_by(Aviso.data_publicacao.desc())
    return await paginate(db, query, page=page, page_size=page_size)

@router.get("/{aviso_id}", response_model=AvisoResponse)
async def get_aviso(aviso_id: str, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Aviso).where(Aviso.id == aviso_id))
    return r.scalar_one_or_none()

@router.post("", status_code=201, dependencies=[Depends(admin_required)])
async def create_aviso(data: AvisoCreate, db: AsyncSession = Depends(get_db)):
    aviso = Aviso(titulo=data.titulo, descricao=data.descricao, prioridade=data.prioridade, data_publicacao=date.today(), enviar_email=data.enviar_email)
    db.add(aviso); await db.commit(); await db.refresh(aviso)
    return aviso

@router.put("/{aviso_id}", dependencies=[Depends(admin_required)])
async def update_aviso(aviso_id: str, data: AvisoCreate, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Aviso).where(Aviso.id == aviso_id))
    aviso = r.scalar_one()
    aviso.titulo = data.titulo; aviso.descricao = data.descricao; aviso.prioridade = data.prioridade; aviso.enviar_email = data.enviar_email
    await db.commit(); await db.refresh(aviso)
    return aviso

@router.delete("/{aviso_id}", status_code=204, dependencies=[Depends(admin_required)])
async def delete_aviso(aviso_id: str, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Aviso).where(Aviso.id == aviso_id))
    await db.delete(r.scalar_one()); await db.commit()
