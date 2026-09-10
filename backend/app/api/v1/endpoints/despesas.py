from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import admin_required
from app.api.deps import get_current_user
from app.schemas.despesa import (
    DespesaCreate,
    DespesaUpdate,
    DespesaResponse,
    DespesaParcelaResponse,
    DuplicarMesRequest,
    DuplicarMesResponse,
    VerificarDuplicacaoResponse,
)
from app.schemas.common import PaginatedResponse
from app.services import despesa_service
from app.utils.pagination import paginate
from app.utils.file_storage import get_file_path

router = APIRouter()


@router.get("", response_model=PaginatedResponse[DespesaResponse], dependencies=[Depends(admin_required)])
async def list_despesas(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    competencia: date = Query(None),
    mes: int = Query(None, ge=1, le=12),
    ano: int = Query(None, ge=2000, le=2100),
    tipo: str = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = await despesa_service.list_despesas(
        db, page=page, page_size=page_size, competencia=competencia, mes=mes, ano=ano, tipo=tipo, status=status
    )
    return await paginate(db, query, page=page, page_size=page_size)


@router.post("/verificar-duplicacao", response_model=VerificarDuplicacaoResponse, dependencies=[Depends(admin_required)])
async def verificar_duplicacao_despesas(
    mes_origem: int = Query(..., ge=1, le=12),
    ano_origem: int = Query(..., ge=2000, le=2100),
    mes_destino: int = Query(..., ge=1, le=12),
    ano_destino: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
):
    return await despesa_service.verificar_duplicacao_despesas(
        db, mes_origem=mes_origem, ano_origem=ano_origem, mes_destino=mes_destino, ano_destino=ano_destino
    )


@router.post("/duplicar-mes", response_model=DuplicarMesResponse, dependencies=[Depends(admin_required)])
async def duplicar_despesas_mes(
    data: DuplicarMesRequest,
    db: AsyncSession = Depends(get_db),
    usuario=Depends(get_current_user),
):
    return await despesa_service.duplicar_despesas_mes(
        db,
        mes_origem=data.mes_origem,
        ano_origem=data.ano_origem,
        mes_destino=data.mes_destino,
        ano_destino=data.ano_destino,
        sobrescrever=data.sobrescrever,
        usuario=usuario,
    )


@router.get("/{despesa_id}", response_model=DespesaResponse, dependencies=[Depends(admin_required)])
async def get_despesa(despesa_id: str, db: AsyncSession = Depends(get_db)):
    return await despesa_service.get_despesa(db, despesa_id)


@router.post("", response_model=DespesaResponse, status_code=201, dependencies=[Depends(admin_required)])
async def create_despesa(data: DespesaCreate, db: AsyncSession = Depends(get_db)):
    return await despesa_service.create_despesa(db, data.model_dump())



@router.put("/{despesa_id}", response_model=DespesaResponse, dependencies=[Depends(admin_required)])
async def update_despesa(despesa_id: str, data: DespesaUpdate, db: AsyncSession = Depends(get_db)):
    return await despesa_service.update_despesa(db, despesa_id, data.model_dump(exclude_unset=True))


@router.post("/{despesa_id}/comprovante", response_model=DespesaResponse, dependencies=[Depends(admin_required)])
async def upload_comprovante_despesa(
    despesa_id: str,
    file: UploadFile = File(...),
    data_pagamento: Optional[date] = Form(None),
    db: AsyncSession = Depends(get_db),
    usuario = Depends(get_current_user),
):
    return await despesa_service.upload_comprovante_despesa(
        db, despesa_id=despesa_id, file=file, data_pagamento=data_pagamento, usuario=usuario
    )


@router.get("/{despesa_id}/comprovante/download", dependencies=[Depends(get_current_user)])
async def download_comprovante_despesa(despesa_id: str, db: AsyncSession = Depends(get_db)):
    desp = await despesa_service.get_despesa(db, despesa_id)
    if not desp.comprovante_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comprovante não encontrado")
    path = get_file_path(desp.comprovante_url)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado no servidor")
    return FileResponse(path, filename=desp.comprovante_nome or f"comprovante_{desp.id}.pdf")


@router.delete("/{despesa_id}", status_code=204, dependencies=[Depends(admin_required)])
async def delete_despesa(despesa_id: str, db: AsyncSession = Depends(get_db)):
    await despesa_service.delete_despesa(db, despesa_id)

