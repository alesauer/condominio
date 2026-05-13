from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import admin_required
from app.schemas.apartamento import ApartamentoCreate, ApartamentoUpdate, ApartamentoResponse, ApartamentoListResponse
from app.schemas.common import PaginatedResponse
from app.schemas.morador import MoradorResponse
from app.schemas.proprietario import ProprietarioResponse, VinculoApartamento
from app.services import apartamento_service
from app.utils.pagination import paginate
from app.models.apartamento_proprietario import ApartamentoProprietario
from app.models.apartamento_morador import ApartamentoMorador
from app.models.cobranca import Cobranca
from sqlalchemy import select

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ApartamentoListResponse])
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


@router.get("/{apartamento_id}", response_model=ApartamentoResponse)
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


@router.get("/{apartamento_id}/proprietarios")
async def list_proprietarios_apartamento(apartamento_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ApartamentoProprietario).where(ApartamentoProprietario.apartamento_id == apartamento_id)
    )
    vinculos = result.scalars().all()
    return [v.proprietario for v in vinculos]


@router.get("/{apartamento_id}/moradores")
async def list_moradores_apartamento(apartamento_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ApartamentoMorador).where(ApartamentoMorador.apartamento_id == apartamento_id)
    )
    vinculos = result.scalars().all()
    return [v.morador for v in vinculos]


@router.post("/{apartamento_id}/vincular-proprietario", dependencies=[Depends(admin_required)])
async def vincular_proprietario(apartamento_id: str, data: VinculoApartamento, db: AsyncSession = Depends(get_db)):
    vinculo = ApartamentoProprietario(
        apartamento_id=apartamento_id, proprietario_id=data.apartamento_id
    )
    db.add(vinculo)
    await db.commit()
    return {"message": "Proprietário vinculado"}


@router.delete("/{apartamento_id}/vincular-proprietario/{proprietario_id}", status_code=204, dependencies=[Depends(admin_required)])
async def desvincular_proprietario(apartamento_id: str, proprietario_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ApartamentoProprietario).where(
            ApartamentoProprietario.apartamento_id == apartamento_id,
            ApartamentoProprietario.proprietario_id == proprietario_id,
        )
    )
    vinculo = result.scalar_one_or_none()
    if vinculo:
        await db.delete(vinculo)
        await db.commit()
