from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.agua_rateio import AguaRateio
from app.models.agua_rateio_apartamento import AguaRateioApartamento
from app.models.apartamento import Apartamento


async def create_rateio(db: AsyncSession, data: dict) -> AguaRateio:
    result = await db.execute(select(AguaRateio).where(AguaRateio.competencia == data["competencia"]))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Já existe rateio para esta competência")

    apto_result = await db.execute(
        select(Apartamento).order_by(Apartamento.numero)
    )
    apartamentos = apto_result.scalars().all()

    if not apartamentos:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nenhum apartamento cadastrado")

    valor_total = Decimal(str(data["valor_total"]))

    # Mapeia as frações ideais cadastradas de cada apartamento (com fallback para 1.0)
    fracoes_map = {}
    for apto in apartamentos:
        if apto.fracao_ideal is not None and Decimal(str(apto.fracao_ideal)) > 0:
            fracoes_map[apto.id] = Decimal(str(apto.fracao_ideal))
        else:
            fracoes_map[apto.id] = Decimal("1.0")

    soma_fracoes = sum(fracoes_map.values())
    if soma_fracoes <= 0:
        soma_fracoes = Decimal("1.0")

    rateio = AguaRateio(
        competencia=data["competencia"],
        valor_total=valor_total,
        observacao=data.get("observacao")
    )
    db.add(rateio)
    await db.flush()

    detalhes = []
    soma_calculada = Decimal("0.00")
    for apto in apartamentos:
        fracao = fracoes_map[apto.id]
        valor = (fracao / soma_fracoes * valor_total).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        soma_calculada += valor
        detail = AguaRateioApartamento(
            rateio_id=rateio.id,
            apartamento_id=apto.id,
            peso=fracao,
            soma_pesos=soma_fracoes,
            valor_calculado=valor,
        )
        detalhes.append(detail)
        db.add(detail)

    # Reconciliação de diferença de centavos (devido a arredondamentos) na unidade de maior fração
    diferenca = valor_total - soma_calculada
    if diferenca != Decimal("0.00") and detalhes:
        item_maior = max(detalhes, key=lambda d: d.peso)
        item_maior.valor_calculado += diferenca

    await db.commit()
    return await get_rateio(db, str(rateio.id))


async def get_rateio(db: AsyncSession, rateio_id: str) -> AguaRateio:
    result = await db.execute(
        select(AguaRateio)
        .options(
            selectinload(AguaRateio.apartamentos).selectinload(AguaRateioApartamento.apartamento)
        )
        .where(AguaRateio.id == rateio_id)
    )
    rateio = result.scalar_one_or_none()
    if not rateio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rateio não encontrado")
    return rateio


async def list_rateios(db, page=1, page_size=20):
    query = (
        select(AguaRateio)
        .options(
            selectinload(AguaRateio.apartamentos).selectinload(AguaRateioApartamento.apartamento)
        )
        .order_by(AguaRateio.competencia.desc())
    )
    return query


async def delete_rateio(db: AsyncSession, rateio_id: str) -> None:
    rateio = await get_rateio(db, rateio_id)
    await db.delete(rateio)
    await db.commit()
