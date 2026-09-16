from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.permissions import admin_required
from app.api.deps import get_current_user
from app.schemas.apartamento import ApartamentoCreate, ApartamentoUpdate, ApartamentoResponse, ApartamentoListResponse
from app.schemas.morador import MoradorResponse
from app.schemas.common import PaginatedResponse
from app.services import apartamento_service
from app.utils.pagination import paginate
from app.models.apartamento_morador import ApartamentoMorador
from app.models.apartamento import Apartamento
from app.models.morador import Morador

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ApartamentoListResponse], dependencies=[Depends(get_current_user)])
async def list_apartamentos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    tipo: str = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = await apartamento_service.list_apartamentos(
        db, page=page, page_size=page_size, search=search, tipo=tipo, status=status
    )
    return await paginate(db, query, page=page, page_size=page_size)


@router.get("/{apartamento_id}", response_model=ApartamentoResponse, dependencies=[Depends(get_current_user)])
async def get_apartamento(apartamento_id: str, db: AsyncSession = Depends(get_db)):
    return await apartamento_service.get_apartamento(db, apartamento_id)


@router.post("", response_model=ApartamentoResponse, status_code=201, dependencies=[Depends(admin_required)])
async def create_apartamento(data: ApartamentoCreate, db: AsyncSession = Depends(get_db)):
    return await apartamento_service.create_apartamento(db, data.model_dump())


@router.put("/{apartamento_id}", response_model=ApartamentoResponse, dependencies=[Depends(admin_required)])
async def update_apartamento(apartamento_id: str, data: ApartamentoUpdate, db: AsyncSession = Depends(get_db)):
    return await apartamento_service.update_apartamento(db, apartamento_id, data.model_dump(exclude_unset=True))


@router.delete("/{apartamento_id}", status_code=204, dependencies=[Depends(admin_required)])
async def delete_apartamento(apartamento_id: str, db: AsyncSession = Depends(get_db)):
    await apartamento_service.delete_apartamento(db, apartamento_id)


@router.get("/{apartamento_id}/moradores", response_model=List[MoradorResponse], dependencies=[Depends(get_current_user)])
async def list_moradores_apartamento(apartamento_id: str, db: AsyncSession = Depends(get_db)):
    aid = UUID(str(apartamento_id))

    # 1. Fetch apto to get proprietario and responsavel
    apto_res = await db.execute(
        select(Apartamento)
        .execution_options(populate_existing=True)
        .options(
            selectinload(Apartamento.proprietario).selectinload(Morador.apartamentos).selectinload(ApartamentoMorador.apartamento),
            selectinload(Apartamento.proprietario).selectinload(Morador.apartamentos_proprietario),
            selectinload(Apartamento.proprietario).selectinload(Morador.apartamentos_responsavel),
            selectinload(Apartamento.responsavel).selectinload(Morador.apartamentos).selectinload(ApartamentoMorador.apartamento),
            selectinload(Apartamento.responsavel).selectinload(Morador.apartamentos_proprietario),
            selectinload(Apartamento.responsavel).selectinload(Morador.apartamentos_responsavel),
        )
        .where(Apartamento.id == aid)
    )
    apto = apto_res.scalar_one_or_none()

    # 2. Fetch all moradores linked via ApartamentoMorador
    result = await db.execute(
        select(Morador)
        .execution_options(populate_existing=True)
        .join(ApartamentoMorador, ApartamentoMorador.morador_id == Morador.id)
        .where(ApartamentoMorador.apartamento_id == aid)
        .options(
            selectinload(Morador.apartamentos).selectinload(ApartamentoMorador.apartamento),
            selectinload(Morador.apartamentos_proprietario),
            selectinload(Morador.apartamentos_responsavel),
        )
    )
    moradores_list = list(result.scalars().all())
    morador_ids = {m.id for m in moradores_list}

    if apto:
        if apto.proprietario and apto.proprietario.id not in morador_ids:
            moradores_list.append(apto.proprietario)
            morador_ids.add(apto.proprietario.id)
        if apto.responsavel and apto.responsavel.id not in morador_ids:
            moradores_list.append(apto.responsavel)
            morador_ids.add(apto.responsavel.id)

    return moradores_list


