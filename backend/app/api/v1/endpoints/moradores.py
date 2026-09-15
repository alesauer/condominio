from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import admin_required
from app.api.deps import get_current_user
from app.schemas.morador import MoradorCreate, MoradorUpdate, MoradorResponse, VincularApartamento
from app.schemas.common import PaginatedResponse
from app.services import morador_service
from app.utils.pagination import paginate
from app.models.apartamento_morador import ApartamentoMorador
from sqlalchemy import select

router = APIRouter()


@router.get("", response_model=PaginatedResponse[MoradorResponse], dependencies=[Depends(get_current_user)])
async def list_moradores(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    tipo: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = await morador_service.list_moradores(db, page=page, page_size=page_size, search=search, tipo=tipo)
    return await paginate(db, query, page=page, page_size=page_size)


@router.get("/{morador_id}", response_model=MoradorResponse, dependencies=[Depends(get_current_user)])
async def get_morador(morador_id: str, db: AsyncSession = Depends(get_db)):
    return await morador_service.get_morador(db, morador_id)


@router.post("", response_model=MoradorResponse, status_code=201, dependencies=[Depends(admin_required)])
async def create_morador(data: MoradorCreate, db: AsyncSession = Depends(get_db)):
    return await morador_service.create_morador(db, data.model_dump())


@router.put("/{morador_id}", response_model=MoradorResponse, dependencies=[Depends(admin_required)])
async def update_morador(morador_id: str, data: MoradorUpdate, db: AsyncSession = Depends(get_db)):
    return await morador_service.update_morador(db, morador_id, data.model_dump(exclude_unset=True))


@router.delete("/{morador_id}", status_code=204, dependencies=[Depends(admin_required)])
async def delete_morador(morador_id: str, db: AsyncSession = Depends(get_db)):
    await morador_service.delete_morador(db, morador_id)


@router.post("/{morador_id}/vincular-apartamento", dependencies=[Depends(admin_required)])
async def vincular_apartamento(morador_id: str, data: VincularApartamento, db: AsyncSession = Depends(get_db)):
    return await morador_service.vincular_apartamento(db, morador_id, data.model_dump())


@router.delete("/{morador_id}/vincular-apartamento/{apartamento_id}", status_code=204, dependencies=[Depends(admin_required)])
async def desvincular_apartamento(morador_id: str, apartamento_id: str, db: AsyncSession = Depends(get_db)):
    await morador_service.desvincular_apartamento(db, morador_id, apartamento_id)
