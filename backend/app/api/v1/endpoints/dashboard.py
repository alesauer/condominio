from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.permissions import admin_required
from app.models.receita import Receita
from app.models.despesa import Despesa
from app.models.cobranca import Cobranca
from app.models.leitura_gas import LeituraGas
from app.models.agua_rateio import AguaRateio

router = APIRouter()


@router.get("/cards", dependencies=[Depends(admin_required)])
async def dashboard_cards(db: AsyncSession = Depends(get_db)):
    hoje = date.today()
    primeiro_dia = date(hoje.year, hoje.month, 1)

    receitas = await db.execute(select(func.coalesce(func.sum(Receita.valor), 0)).where(Receita.status == "pago"))
    despesas = await db.execute(select(func.coalesce(func.sum(Despesa.valor), 0)).where(Despesa.status == "pago"))
    receitas_mes = await db.execute(select(func.coalesce(func.sum(Receita.valor), 0)).where(Receita.competencia >= primeiro_dia, Receita.status == "pago"))
    despesas_mes = await db.execute(select(func.coalesce(func.sum(Despesa.valor), 0)).where(Despesa.competencia >= primeiro_dia, Despesa.status == "pago"))
    despesas_extra = await db.execute(select(func.coalesce(func.sum(Despesa.valor), 0)).where(Despesa.competencia >= primeiro_dia, Despesa.tipo == "extraordinaria"))
    inadimplencia = await db.execute(select(func.coalesce(func.sum(func.coalesce(Cobranca.valor_total, Cobranca.valor)), 0)).where(Cobranca.status == "atrasado"))

    return {
        "saldo_atual": float(receitas.scalar() or 0) - float(despesas.scalar() or 0),
        "receitas_mes": float(receitas_mes.scalar() or 0),
        "despesas_mes": float(despesas_mes.scalar() or 0),
        "contas_extraordinarias": float(despesas_extra.scalar() or 0),
        "inadimplencia_total": float(inadimplencia.scalar() or 0),
    }


@router.get("/receitas-mensais", dependencies=[Depends(admin_required)])
async def receitas_mensais(ano: int = Query(None), db: AsyncSession = Depends(get_db)):
    if not ano:
        ano = date.today().year
    col_mes = func.to_char(Receita.competencia, "YYYY-MM")
    result = await db.execute(
        select(col_mes, func.sum(Receita.valor))
        .where(func.extract("year", Receita.competencia) == ano, Receita.status == "pago")
        .group_by(col_mes)
        .order_by(col_mes)
    )
    return [{"mes": r[0], "valor": float(r[1])} for r in result.all()]


@router.get("/despesas-mensais", dependencies=[Depends(admin_required)])
async def despesas_mensais(ano: int = Query(None), db: AsyncSession = Depends(get_db)):
    if not ano:
        ano = date.today().year
    col_mes = func.to_char(Despesa.competencia, "YYYY-MM")
    result = await db.execute(
        select(col_mes, func.sum(Despesa.valor))
        .where(func.extract("year", Despesa.competencia) == ano, Despesa.status == "pago")
        .group_by(col_mes)
        .order_by(col_mes)
    )
    return [{"mes": r[0], "valor": float(r[1])} for r in result.all()]
