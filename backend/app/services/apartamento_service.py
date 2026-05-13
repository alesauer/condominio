from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from fastapi import HTTPException, status
from app.models.apartamento import Apartamento


PESOS = {"padrao": 1.0, "area_privativa": 1.5, "cobertura": 2.0}


def get_peso(tipo: str) -> float:
    return PESOS.get(tipo, 1.0)


async def create_apartamento(db: AsyncSession, data: dict) -> Apartamento:
    apto = Apartamento(**data)
    db.add(apto)
    await db.commit()
    await db.refresh(apto)
    return apto


async def get_apartamento(db: AsyncSession, apartamento_id: str) -> Apartamento:
    result = await db.execute(select(Apartamento).where(Apartamento.id == apartamento_id))
    apto = result.scalar_one_or_none()
    if not apto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Apartamento não encontrado")
    return apto


async def list_apartamentos(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    search: str = None,
    tipo: str = None,
    status: str = None,
):
    query = select(Apartamento)
    if search:
        query = query.where(
            or_(Apartamento.numero.ilike(f"%{search}%"), Apartamento.bloco.ilike(f"%{search}%"))
        )
    if tipo:
        query = query.where(Apartamento.tipo == tipo)
    if status:
        query = query.where(Apartamento.status == status)
    query = query.order_by(Apartamento.numero)
    return query


async def update_apartamento(db: AsyncSession, apartamento_id: str, data: dict) -> Apartamento:
    apto = await get_apartamento(db, apartamento_id)
    for key, value in data.items():
        if value is not None:
            setattr(apto, key, value)
    await db.commit()
    await db.refresh(apto)
    return apto


async def delete_apartamento(db: AsyncSession, apartamento_id: str) -> None:
    apto = await get_apartamento(db, apartamento_id)
    await db.delete(apto)
    await db.commit()
