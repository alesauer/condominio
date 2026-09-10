from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.permissions import admin_required
from app.schemas.proprietario import ProprietarioCreate, ProprietarioUpdate, ProprietarioResponse
from app.schemas.apartamento import ApartamentoListResponse
from app.schemas.common import PaginatedResponse
from app.services import proprietario_service
from app.utils.pagination import paginate
from app.models.apartamento import Apartamento

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ProprietarioResponse], dependencies=[Depends(admin_required)])
async def list_proprietarios(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = await proprietario_service.list_proprietarios(db, page=page, page_size=page_size, search=search)
    return await paginate(db, query, page=page, page_size=page_size)


@router.get("/{proprietario_id}", response_model=ProprietarioResponse, dependencies=[Depends(admin_required)])
async def get_proprietario(proprietario_id: str, db: AsyncSession = Depends(get_db)):
    return await proprietario_service.get_proprietario(db, proprietario_id)


@router.post("", response_model=ProprietarioResponse, status_code=201, dependencies=[Depends(admin_required)])
async def create_proprietario(data: ProprietarioCreate, db: AsyncSession = Depends(get_db)):
    return await proprietario_service.create_proprietario(db, data.model_dump())


@router.put("/{proprietario_id}", response_model=ProprietarioResponse, dependencies=[Depends(admin_required)])
async def update_proprietario(proprietario_id: str, data: ProprietarioUpdate, db: AsyncSession = Depends(get_db)):
    return await proprietario_service.update_proprietario(db, proprietario_id, data.model_dump(exclude_unset=True))


@router.delete("/{proprietario_id}", status_code=204, dependencies=[Depends(admin_required)])
async def delete_proprietario(proprietario_id: str, db: AsyncSession = Depends(get_db)):
    await proprietario_service.delete_proprietario(db, proprietario_id)


@router.get("/{proprietario_id}/apartamentos", response_model=PaginatedResponse[ApartamentoListResponse])
async def list_apartamentos_proprietario(
    proprietario_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Apartamento).where(Apartamento.proprietario_id == proprietario_id).order_by(Apartamento.numero)
    return await paginate(db, query, page=page, page_size=page_size)
