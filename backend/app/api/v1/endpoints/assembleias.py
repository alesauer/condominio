from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.permissions import admin_required
from app.api.deps import get_current_user
from app.models.assembleia import Assembleia
from app.models.pauta import Pauta
from app.models.ata import Ata
from app.utils.pagination import paginate
from pydantic import BaseModel
from datetime import date, time
from typing import Optional, List
from uuid import UUID

router = APIRouter()


class PautaCreate(BaseModel):
    ordem: int
    descricao: str


class AssembleiaCreate(BaseModel):
    data: date
    titulo: str
    descricao: Optional[str] = None
    local: Optional[str] = None
    hora_inicio: Optional[str] = None
    hora_fim: Optional[str] = None
    pautas: List[PautaCreate] = []


@router.get("", dependencies=[Depends(get_current_user)])
async def list_assembleias(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Assembleia).order_by(Assembleia.data.desc())
    return await paginate(db, query, page=page, page_size=page_size)


@router.get("/{assembleia_id}", dependencies=[Depends(get_current_user)])
async def get_assembleia(assembleia_id: str, db: AsyncSession = Depends(get_db)):
    try:
        aid = UUID(assembleia_id) if isinstance(assembleia_id, str) else assembleia_id
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    r = await db.execute(
        select(Assembleia)
        .options(selectinload(Assembleia.pautas), selectinload(Assembleia.ata))
        .where(Assembleia.id == aid)
    )
    assembleia = r.scalar_one_or_none()
    if not assembleia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")
    return assembleia


@router.post("", status_code=201, dependencies=[Depends(admin_required)])
async def create_assembleia(data: AssembleiaCreate, db: AsyncSession = Depends(get_db)):
    a = Assembleia(data=data.data, titulo=data.titulo, descricao=data.descricao, local=data.local)
    if data.hora_inicio:
        a.hora_inicio = time.fromisoformat(data.hora_inicio)
    if data.hora_fim:
        a.hora_fim = time.fromisoformat(data.hora_fim)
    db.add(a)
    await db.flush()
    for p in data.pautas:
        db.add(Pauta(assembleia_id=a.id, ordem=p.ordem, descricao=p.descricao))
    await db.commit()
    await db.refresh(a)
    return a


@router.put("/{assembleia_id}", dependencies=[Depends(admin_required)])
async def update_assembleia(assembleia_id: str, data: AssembleiaCreate, db: AsyncSession = Depends(get_db)):
    try:
        aid = UUID(assembleia_id) if isinstance(assembleia_id, str) else assembleia_id
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    r = await db.execute(
        select(Assembleia)
        .options(selectinload(Assembleia.pautas), selectinload(Assembleia.ata))
        .where(Assembleia.id == aid)
    )
    a = r.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    a.data = data.data
    a.titulo = data.titulo
    a.descricao = data.descricao
    a.local = data.local
    if data.hora_inicio:
        a.hora_inicio = time.fromisoformat(data.hora_inicio)
    if data.hora_fim:
        a.hora_fim = time.fromisoformat(data.hora_fim)
    await db.commit()
    await db.refresh(a)
    return a


@router.delete("/{assembleia_id}", status_code=204, dependencies=[Depends(admin_required)])
async def delete_assembleia(assembleia_id: str, db: AsyncSession = Depends(get_db)):
    try:
        aid = UUID(assembleia_id) if isinstance(assembleia_id, str) else assembleia_id
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    r = await db.execute(select(Assembleia.id).where(Assembleia.id == aid))
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    try:
        # Exclui registros filhos explicitamente (pautas e atas) para evitar qualquer violação de FK
        await db.execute(delete(Pauta).where(Pauta.assembleia_id == aid))
        await db.execute(delete(Ata).where(Ata.assembleia_id == aid))
        # Exclui a assembleia diretamente via SQL eliminando problemas de StaleDataError no ORM
        await db.execute(delete(Assembleia).where(Assembleia.id == aid))
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao excluir assembleia: {str(e)}")

