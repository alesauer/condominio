from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import admin_required
from app.api.deps import get_current_user
from app.schemas.receita import (
    ReceitaCreate,
    ReceitaUpdate,
    ReceitaResponse,
    DuplicarMesRequest,
    DuplicarMesResponse,
    VerificarDuplicacaoResponse,
    SincronizarReceitasRequest,
    SincronizarReceitasResponse,
)
from app.schemas.common import PaginatedResponse
from app.services import receita_service
from app.utils.pagination import paginate
from app.utils.file_storage import get_file_path

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ReceitaResponse], dependencies=[Depends(admin_required)])
async def list_receitas(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    competencia: date = Query(None),
    mes: int = Query(None, ge=1, le=12),
    ano: int = Query(None, ge=2000, le=2100),
    tipo: str = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = await receita_service.list_receitas(
        db, page=page, page_size=page_size, competencia=competencia, mes=mes, ano=ano, tipo=tipo, status=status
    )
    return await paginate(db, query, page=page, page_size=page_size)


@router.post("/sincronizar-mes", response_model=SincronizarReceitasResponse, dependencies=[Depends(admin_required)])
async def sincronizar_receitas_mes(
    data: SincronizarReceitasRequest,
    db: AsyncSession = Depends(get_db),
    usuario=Depends(get_current_user),
):
    return await receita_service.sincronizar_receitas_mes(
        db,
        competencia=data.competencia,
        mes=data.mes,
        ano=data.ano,
        vencimento=data.vencimento,
        usuario=usuario,
    )


@router.post("/verificar-duplicacao", response_model=VerificarDuplicacaoResponse, dependencies=[Depends(admin_required)])
async def verificar_duplicacao_receitas(
    mes_origem: int = Query(..., ge=1, le=12),
    ano_origem: int = Query(..., ge=2000, le=2100),
    mes_destino: int = Query(..., ge=1, le=12),
    ano_destino: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
):
    return await receita_service.verificar_duplicacao_receitas(
        db, mes_origem=mes_origem, ano_origem=ano_origem, mes_destino=mes_destino, ano_destino=ano_destino
    )


@router.post("/duplicar-mes", response_model=DuplicarMesResponse, dependencies=[Depends(admin_required)])
async def duplicar_receitas_mes(
    data: DuplicarMesRequest,
    db: AsyncSession = Depends(get_db),
    usuario=Depends(get_current_user),
):
    return await receita_service.duplicar_receitas_mes(
        db,
        mes_origem=data.mes_origem,
        ano_origem=data.ano_origem,
        mes_destino=data.mes_destino,
        ano_destino=data.ano_destino,
        sobrescrever=data.sobrescrever,
        usuario=usuario,
    )


@router.get("/{receita_id}", response_model=ReceitaResponse, dependencies=[Depends(admin_required)])
async def get_receita(receita_id: str, db: AsyncSession = Depends(get_db)):
    return await receita_service.get_receita(db, receita_id)


@router.post("", response_model=ReceitaResponse, status_code=201, dependencies=[Depends(admin_required)])
async def create_receita(data: ReceitaCreate, db: AsyncSession = Depends(get_db)):
    return await receita_service.create_receita(db, data.model_dump())



@router.put("/{receita_id}", response_model=ReceitaResponse, dependencies=[Depends(admin_required)])
async def update_receita(receita_id: str, data: ReceitaUpdate, db: AsyncSession = Depends(get_db)):
    return await receita_service.update_receita(db, receita_id, data.model_dump(exclude_unset=True))


@router.post("/{receita_id}/comprovante", response_model=ReceitaResponse, dependencies=[Depends(admin_required)])
async def upload_comprovante_receita(
    receita_id: str,
    file: UploadFile = File(...),
    data_recebimento: Optional[date] = Form(None),
    db: AsyncSession = Depends(get_db),
    usuario = Depends(get_current_user),
):
    return await receita_service.upload_comprovante_receita(
        db, receita_id=receita_id, file=file, data_recebimento=data_recebimento, usuario=usuario
    )


@router.get("/{receita_id}/comprovante/download", dependencies=[Depends(get_current_user)])
async def download_comprovante_receita(receita_id: str, db: AsyncSession = Depends(get_db)):
    rec = await receita_service.get_receita(db, receita_id)
    if not rec.comprovante_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comprovante não encontrado")
    path = get_file_path(rec.comprovante_url)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado no servidor")
    return FileResponse(path, filename=rec.comprovante_nome or f"comprovante_{rec.id}.pdf")


@router.delete("/{receita_id}", status_code=204, dependencies=[Depends(admin_required)])
async def delete_receita(receita_id: str, db: AsyncSession = Depends(get_db)):
    await receita_service.delete_receita(db, receita_id)

