from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import admin_required
from app.schemas.despesa import DespesaCreate, DespesaUpdate, DespesaResponse, DespesaParcelaResponse
from app.schemas.common import PaginatedResponse
from app.services import despesa_service
from app.utils.pagination import paginate

router = APIRouter()


@router.get("", response_model=PaginatedResponse[DespesaResponse], dependencies=[Depends(admin_required)])
async def list_despesas(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    competencia: date = Query(None),
    tipo: str = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = await despesa_service.list_despesas(db, page=page, page_size=page_size, competencia=competencia, tipo=tipo, status=status)
    return await paginate(db, query, page=page, page_size=page_size)


@router.get("/{despesa_id}", response_model=DespesaResponse, dependencies=[Depends(admin_required)])
async def get_despesa(despesa_id: str, db: AsyncSession = Depends(get_db)):
    return await despesa_service.get_despesa(db, despesa_id)


@router.post("", response_model=DespesaResponse, status_code=201, dependencies=[Depends(admin_required)])
async def create_despesa(data: DespesaCreate, db: AsyncSession = Depends(get_db)):
    return await despesa_service.create_despesa(db, data.model_dump())


@router.put("/{despesa_id}", response_model=DespesaResponse, dependencies=[Depends(admin_required)])
async def update_despesa(despesa_id: str, data: DespesaUpdate, db: AsyncSession = Depends(get_db)):
    return await despesa_service.update_despesa(db, despesa_id, data.model_dump(exclude_unset=True))


@router.delete("/{despesa_id}", status_code=204, dependencies=[Depends(admin_required)])
async def delete_despesa(despesa_id: str, db: AsyncSession = Depends(get_db)):
    await despesa_service.delete_despesa(db, despesa_id)
