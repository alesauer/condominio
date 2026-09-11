from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import admin_required
from app.schemas.cobranca import (
    CobrancaResponse,
    CobrancaGerarMensal,
    CobrancaGerarMensalResult,
    CobrancaPreviaResult,
    DemonstrativoMensalResponse,
    SalvarAcoesEventosRequest,
    DemonstrativoAcaoEvento,
    SalvarTrocaGasRequest,
    DemonstrativoTrocaGas,
    SalvarMensagemVencimentoRequest,
    EnviarDemonstrativoEmailRequest,
    EnviarDemonstrativoEmailResult,
)
from app.schemas.common import PaginatedResponse
from app.services import cobranca_service
from app.utils.pagination import paginate

router = APIRouter()


@router.get("/demonstrativo-mensal", response_model=DemonstrativoMensalResponse, dependencies=[Depends(admin_required)])
async def obter_demonstrativo_mensal(
    competencia: date = Query(..., description="Mês de competência (ex: 2026-09-01)"),
    db: AsyncSession = Depends(get_db),
):
    return await cobranca_service.obter_demonstrativo_mensal(db, competencia=competencia)


@router.post("/enviar-email-demonstrativo", response_model=EnviarDemonstrativoEmailResult)
async def enviar_email_demonstrativo(
    data: EnviarDemonstrativoEmailRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(admin_required),
):
    return await cobranca_service.enviar_email_demonstrativo(db, data.model_dump(), usuario=current_user)


@router.post("/mensagem-vencimento")
async def salvar_mensagem_vencimento(
    data: SalvarMensagemVencimentoRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(admin_required),
):
    return await cobranca_service.salvar_mensagem_vencimento(db, data.model_dump(), usuario=current_user)


@router.post("/troca-gas", response_model=DemonstrativoTrocaGas)
async def salvar_troca_gas(
    data: SalvarTrocaGasRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(admin_required),
):
    return await cobranca_service.salvar_troca_gas_config(db, data.model_dump(), usuario=current_user)


@router.post("/acoes-eventos", response_model=list[DemonstrativoAcaoEvento])
async def salvar_acoes_eventos(
    data: SalvarAcoesEventosRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(admin_required),
):
    return await cobranca_service.salvar_acoes_eventos(
        db, competencia=data.competencia, acoes_eventos=data.acoes_eventos, usuario=current_user
    )


@router.delete("/acoes-eventos/{aviso_id}", status_code=204)
async def delete_acao_evento(
    aviso_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(admin_required),
):
    await cobranca_service.delete_acao_evento(db, aviso_id=aviso_id, usuario=current_user)
    return None


@router.get("", response_model=PaginatedResponse[CobrancaResponse], dependencies=[Depends(admin_required)])
async def list_cobrancas(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    apartamento_id: str = Query(None),
    competencia: date = Query(None),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = await cobranca_service.list_cobrancas(
        db, page=page, page_size=page_size, apartamento_id=apartamento_id, competencia=competencia, status=status
    )
    return await paginate(db, query, page=page, page_size=page_size)


@router.post("/previa-mensal", response_model=CobrancaPreviaResult, dependencies=[Depends(admin_required)])
async def calcular_previa_cobrancas(
    data: CobrancaGerarMensal,
    db: AsyncSession = Depends(get_db),
):
    return await cobranca_service.calcular_previa_cobrancas(db, data.model_dump())


@router.post("/gerar-mensal", response_model=CobrancaGerarMensalResult, status_code=201)
async def gerar_cobrancas_mensais(
    data: CobrancaGerarMensal,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(admin_required),
):
    return await cobranca_service.gerar_cobrancas_mensais(db, data.model_dump(), usuario=current_user)


@router.get("/{cobranca_id}", response_model=CobrancaResponse, dependencies=[Depends(admin_required)])
async def get_cobranca(cobranca_id: str, db: AsyncSession = Depends(get_db)):
    return await cobranca_service.get_cobranca(db, cobranca_id)


@router.put("/{cobranca_id}/pagar", response_model=CobrancaResponse)
async def pagar_cobranca(
    cobranca_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(admin_required),
):
    return await cobranca_service.pagar_cobranca(db, cobranca_id, usuario=current_user)
