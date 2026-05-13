from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.permissions import admin_required
from app.models.auditoria import Auditoria
from app.utils.pagination import paginate

router = APIRouter()


@router.get("", dependencies=[Depends(admin_required)])
async def list_auditoria(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    entidade_tipo: str = Query(None),
    usuario_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Auditoria)
    if entidade_tipo: query = query.where(Auditoria.entidade_tipo == entidade_tipo)
    if usuario_id: query = query.where(Auditoria.usuario_id == usuario_id)
    query = query.order_by(Auditoria.created_at.desc())
    return await paginate(db, query, page=page, page_size=page_size)
