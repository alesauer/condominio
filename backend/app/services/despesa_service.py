from datetime import date
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.despesa import Despesa
from app.models.despesa_parcela import DespesaParcela


async def create_despesa(db: AsyncSession, data: dict) -> Despesa:
    parcelamento = data.pop("parcelamento", False)
    total_parcelas = data.pop("total_parcelas", None)

    desp = Despesa(parcelamento=parcelamento, total_parcelas=total_parcelas, **data)
    db.add(desp)
    await db.flush()

    if parcelamento and total_parcelas and total_parcelas > 1:
        valor_parcela = Decimal(str(data["valor"])) / total_parcelas
        valor_parcela = valor_parcela.quantize(Decimal("0.01"))
        competencia_base = data.get("competencia", date.today())

        for i in range(1, total_parcelas + 1):
            parcela_competencia = competencia_base + relativedelta(months=i - 1)
            parcela = DespesaParcela(
                despesa_id=desp.id,
                numero_parcela=i,
                valor=valor_parcela,
                competencia=parcela_competencia,
                vencimento=data.get("vencimento"),
                status="pendente",
            )
            db.add(parcela)

    await db.commit()
    await db.refresh(desp)
    return desp


async def get_despesa(db: AsyncSession, despesa_id: str) -> Despesa:
    result = await db.execute(select(Despesa).where(Despesa.id == despesa_id))
    desp = result.scalar_one_or_none()
    if not desp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Despesa não encontrada")
    return desp


async def list_despesas(db, page=1, page_size=20, competencia=None, tipo=None, status=None):
    query = select(Despesa)
    if competencia:
        query = query.where(Despesa.competencia == competencia)
    if tipo:
        query = query.where(Despesa.tipo == tipo)
    if status:
        query = query.where(Despesa.status == status)
    return query.order_by(Despesa.competencia.desc())


async def update_despesa(db: AsyncSession, despesa_id: str, data: dict) -> Despesa:
    desp = await get_despesa(db, despesa_id)
    for key, value in data.items():
        if value is not None:
            setattr(desp, key, value)
    await db.commit()
    await db.refresh(desp)
    return desp


async def delete_despesa(db: AsyncSession, despesa_id: str) -> None:
    desp = await get_despesa(db, despesa_id)
    await db.delete(desp)
    await db.commit()
