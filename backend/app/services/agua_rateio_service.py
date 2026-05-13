from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.agua_rateio import AguaRateio
from app.models.agua_rateio_apartamento import AguaRateioApartamento
from app.models.apartamento import Apartamento, StatusApartamento
from app.services.apartamento_service import get_peso


async def create_rateio(db: AsyncSession, data: dict) -> AguaRateio:
    result = await db.execute(select(AguaRateio).where(AguaRateio.competencia == data["competencia"]))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Já existe rateio para esta competência")

    apto_result = await db.execute(
        select(Apartamento).where(Apartamento.status.in_([StatusApartamento.ocupado, StatusApartamento.alugado]))
    )
    apartamentos = apto_result.scalars().all()

    if not apartamentos:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nenhum apartamento ocupado ou alugado")

    rateio = AguaRateio(competencia=data["competencia"], valor_total=data["valor_total"], observacao=data.get("observacao"))
    db.add(rateio)
    await db.flush()

    pesos_map = {apto.id: get_peso(str(apto.tipo.value) if hasattr(apto.tipo, 'value') else str(apto.tipo)) for apto in apartamentos}
    soma_pesos = sum(pesos_map.values())
    valor_total = Decimal(str(data["valor_total"]))

    for apto in apartamentos:
        peso = Decimal(str(pesos_map[apto.id]))
        valor = (peso / Decimal(str(soma_pesos)) * valor_total).quantize(Decimal("0.01"))
        detail = AguaRateioApartamento(
            rateio_id=rateio.id, apartamento_id=apto.id,
            peso=peso, soma_pesos=Decimal(str(soma_pesos)), valor_calculado=valor,
        )
        db.add(detail)

    await db.commit()
    await db.refresh(rateio)
    return rateio


async def get_rateio(db: AsyncSession, rateio_id: str) -> AguaRateio:
    result = await db.execute(select(AguaRateio).where(AguaRateio.id == rateio_id))
    rateio = result.scalar_one_or_none()
    if not rateio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rateio não encontrado")
    return rateio


async def list_rateios(db, page=1, page_size=20):
    query = select(AguaRateio).order_by(AguaRateio.competencia.desc())
    return query


async def delete_rateio(db: AsyncSession, rateio_id: str) -> None:
    rateio = await get_rateio(db, rateio_id)
    await db.delete(rateio)
    await db.commit()
