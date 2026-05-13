from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.permissions import admin_required
from app.models.assembleia import Assembleia
from app.models.pauta import Pauta
from app.models.ata import Ata
from app.utils.pagination import paginate
from pydantic import BaseModel
from datetime import date, time
from typing import Optional, List
from uuid import UUID

router = APIRouter()

class PautaCreate(BaseModel): ordem: int; descricao: str
class AssembleiaCreate(BaseModel):
    data: date; titulo: str; descricao: Optional[str] = None; local: Optional[str] = None
    hora_inicio: Optional[str] = None; hora_fim: Optional[str] = None; pautas: List[PautaCreate] = []

@router.get("")
async def list_assembleias(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    query = select(Assembleia).order_by(Assembleia.data.desc())
    return await paginate(db, query, page=page, page_size=page_size)

@router.get("/{assembleia_id}")
async def get_assembleia(assembleia_id: str, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Assembleia).where(Assembleia.id == assembleia_id))
    return r.scalar_one_or_none()

@router.post("", status_code=201, dependencies=[Depends(admin_required)])
async def create_assembleia(data: AssembleiaCreate, db: AsyncSession = Depends(get_db)):
    a = Assembleia(data=data.data, titulo=data.titulo, descricao=data.descricao, local=data.local)
    if data.hora_inicio: a.hora_inicio = time.fromisoformat(data.hora_inicio)
    if data.hora_fim: a.hora_fim = time.fromisoformat(data.hora_fim)
    db.add(a); await db.flush()
    for p in data.pautas:
        db.add(Pauta(assembleia_id=a.id, ordem=p.ordem, descricao=p.descricao))
    await db.commit(); await db.refresh(a)
    return a

@router.put("/{assembleia_id}", dependencies=[Depends(admin_required)])
async def update_assembleia(assembleia_id: str, data: AssembleiaCreate, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Assembleia).where(Assembleia.id == assembleia_id))
    a = r.scalar_one()
    a.data = data.data; a.titulo = data.titulo; a.descricao = data.descricao; a.local = data.local
    if data.hora_inicio: a.hora_inicio = time.fromisoformat(data.hora_inicio)
    if data.hora_fim: a.hora_fim = time.fromisoformat(data.hora_fim)
    await db.commit(); await db.refresh(a)
    return a

@router.delete("/{assembleia_id}", status_code=204, dependencies=[Depends(admin_required)])
async def delete_assembleia(assembleia_id: str, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Assembleia).where(Assembleia.id == assembleia_id))
    await db.delete(r.scalar_one()); await db.commit()
