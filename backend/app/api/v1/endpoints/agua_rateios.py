from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import admin_required
from app.api.deps import get_current_user
from app.schemas.agua_rateio import AguaRateioCreate, AguaRateioResponse
from app.schemas.common import PaginatedResponse
from app.services import agua_rateio_service
from app.utils.pagination import paginate

router = APIRouter()


@router.get("", response_model=PaginatedResponse[AguaRateioResponse], dependencies=[Depends(get_current_user)])
async def list_rateios(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    query = await agua_rateio_service.list_rateios(db, page=page, page_size=page_size)
    return await paginate(db, query, page=page, page_size=page_size)


@router.get("/{rateio_id}", response_model=AguaRateioResponse, dependencies=[Depends(get_current_user)])
async def get_rateio(rateio_id: str, db: AsyncSession = Depends(get_db)):
    return await agua_rateio_service.get_rateio(db, rateio_id)


@router.post("", response_model=AguaRateioResponse, status_code=201, dependencies=[Depends(admin_required)])
async def create_rateio(data: AguaRateioCreate, db: AsyncSession = Depends(get_db)):
    return await agua_rateio_service.create_rateio(db, data.model_dump())


@router.delete("/{rateio_id}", status_code=204, dependencies=[Depends(admin_required)])
async def delete_rateio(rateio_id: str, db: AsyncSession = Depends(get_db)):
    await agua_rateio_service.delete_rateio(db, rateio_id)
