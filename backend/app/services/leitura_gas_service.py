from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.leitura_gas import LeituraGas


async def create_leitura(db: AsyncSession, data: dict) -> LeituraGas:
    result = await db.execute(
        select(LeituraGas).where(
            LeituraGas.apartamento_id == data["apartamento_id"],
            LeituraGas.competencia == data["competencia"],
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Já existe leitura para este apartamento nesta competência")

    leitura_anterior_val = data.get("leitura_anterior")
    if not leitura_anterior_val:
        ant_result = await db.execute(
            select(LeituraGas).where(
                LeituraGas.apartamento_id == data["apartamento_id"],
                LeituraGas.competencia < data["competencia"],
            ).order_by(LeituraGas.competencia.desc()).limit(1)
        )
        anterior = ant_result.scalar_one_or_none()
        leitura_anterior_val = anterior.leitura_atual if anterior else Decimal("0")

    leitura_atual = Decimal(str(data["leitura_atual"]))
    leitura_anterior_dec = Decimal(str(leitura_anterior_val)) if leitura_anterior_val else Decimal("0")
    consumo = leitura_atual - leitura_anterior_dec

    valor_unitario = Decimal(str(data.get("valor_unitario", 0)))
    valor_cobrado = consumo * valor_unitario if valor_unitario > 0 else None

    leitura = LeituraGas(
        apartamento_id=data["apartamento_id"],
        competencia=data["competencia"],
        leitura_anterior=leitura_anterior_dec if leitura_anterior_dec > 0 else None,
        leitura_atual=leitura_atual,
        consumo=consumo,
        valor_unitario=valor_unitario if valor_unitario > 0 else None,
        valor_cobrado=valor_cobrado,
        observacao=data.get("observacao"),
    )
    db.add(leitura)
    await db.commit()
    return await get_leitura(db, str(leitura.id))


async def get_leitura(db: AsyncSession, leitura_id: str) -> LeituraGas:
    result = await db.execute(
        select(LeituraGas)
        .options(selectinload(LeituraGas.apartamento))
        .where(LeituraGas.id == leitura_id)
    )
    l = result.scalar_one_or_none()
    if not l:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leitura não encontrada")
    return l


async def list_leituras(db, page=1, page_size=20, apartamento_id=None, competencia=None):
    query = select(LeituraGas).options(selectinload(LeituraGas.apartamento))
    if apartamento_id:
        query = query.where(LeituraGas.apartamento_id == apartamento_id)
    if competencia:
        query = query.where(LeituraGas.competencia == competencia)
    return query.order_by(LeituraGas.competencia.desc())


async def update_leitura(db: AsyncSession, leitura_id: str, data: dict) -> LeituraGas:
    leitura = await get_leitura(db, leitura_id)
    for key, value in data.items():
        if value is not None:
            setattr(leitura, key, value)
    if "leitura_atual" in data:
        leitura_ant = leitura.leitura_anterior or Decimal("0")
        leitura.consumo = Decimal(str(data["leitura_atual"])) - Decimal(str(leitura_ant))
    await db.commit()
    await db.refresh(leitura)
    return leitura
