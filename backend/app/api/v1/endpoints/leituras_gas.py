from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import admin_required
from app.schemas.leitura_gas import (
    LeituraGasCreate,
    LeituraGasSalvarLotePayload,
    LeituraGasPlanilhaResponse,
    LeituraGasResponse,
)
from app.schemas.common import PaginatedResponse
from app.services import leitura_gas_service
from app.utils.pagination import paginate

router = APIRouter()


@router.get("/planilha", response_model=LeituraGasPlanilhaResponse, dependencies=[Depends(admin_required)])
async def obter_planilha_gas(
    competencia: date = Query(..., description="Mês de competência (ex: 2026-09-01)"),
    db: AsyncSession = Depends(get_db),
):
    return await leitura_gas_service.obter_planilha_gas(db, competencia=competencia)


@router.post("/lote", response_model=LeituraGasPlanilhaResponse)
async def salvar_lote(
    data: LeituraGasSalvarLotePayload,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(admin_required),
):
    return await leitura_gas_service.salvar_leituras_lote(db, data.model_dump(), usuario=current_user)


@router.get("", response_model=PaginatedResponse[LeituraGasResponse], dependencies=[Depends(admin_required)])
async def list_leituras(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    apartamento_id: str = Query(None),
    competencia: date = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = await leitura_gas_service.list_leituras(db, page=page, page_size=page_size, apartamento_id=apartamento_id, competencia=competencia)
    return await paginate(db, query, page=page, page_size=page_size)


@router.get("/{leitura_id}", response_model=LeituraGasResponse, dependencies=[Depends(admin_required)])
async def get_leitura(leitura_id: str, db: AsyncSession = Depends(get_db)):
    return await leitura_gas_service.get_leitura(db, leitura_id)


@router.post("", response_model=LeituraGasResponse, status_code=201, dependencies=[Depends(admin_required)])
async def create_leitura(data: LeituraGasCreate, db: AsyncSession = Depends(get_db)):
    return await leitura_gas_service.create_leitura(db, data.model_dump())


@router.put("/{leitura_id}", response_model=LeituraGasResponse, dependencies=[Depends(admin_required)])
async def update_leitura(leitura_id: str, data: LeituraGasCreate, db: AsyncSession = Depends(get_db)):
    return await leitura_gas_service.update_leitura(db, leitura_id, data.model_dump(exclude_unset=True))


@router.delete("/{leitura_id}", dependencies=[Depends(admin_required)])
async def delete_leitura(leitura_id: str, db: AsyncSession = Depends(get_db)):
    await leitura_gas_service.delete_leitura(db, leitura_id)
    return {"message": "Leitura excluída com sucesso"}

