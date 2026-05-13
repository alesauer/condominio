from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from fastapi import HTTPException, status
from app.models.morador import Morador
from app.models.apartamento_morador import ApartamentoMorador


async def create_morador(db: AsyncSession, data: dict) -> Morador:
    morador = Morador(**data)
    db.add(morador)
    await db.commit()
    await db.refresh(morador)
    return morador


async def get_morador(db: AsyncSession, morador_id: str) -> Morador:
    result = await db.execute(select(Morador).where(Morador.id == morador_id))
    morador = result.scalar_one_or_none()
    if not morador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Morador não encontrado")
    return morador


async def list_moradores(db: AsyncSession, page: int = 1, page_size: int = 20, search: str = None, tipo: str = None):
    query = select(Morador)
    if search:
        query = query.where(
            or_(Morador.nome.ilike(f"%{search}%"), Morador.cpf.ilike(f"%{search}%"))
        )
    if tipo:
        query = query.where(Morador.tipo == tipo)
    query = query.order_by(Morador.nome)
    return query


async def update_morador(db: AsyncSession, morador_id: str, data: dict) -> Morador:
    morador = await get_morador(db, morador_id)
    for key, value in data.items():
        if value is not None:
            setattr(morador, key, value)
    await db.commit()
    await db.refresh(morador)
    return morador


async def delete_morador(db: AsyncSession, morador_id: str) -> None:
    morador = await get_morador(db, morador_id)
    await db.delete(morador)
    await db.commit()


async def vincular_apartamento(db: AsyncSession, morador_id: str, data: dict) -> ApartamentoMorador:
    vinculo = ApartamentoMorador(
        morador_id=morador_id,
        apartamento_id=data["apartamento_id"],
        data_inicio=data["data_inicio"],
        data_fim=data.get("data_fim"),
    )
    db.add(vinculo)
    await db.commit()
    await db.refresh(vinculo)
    return vinculo


async def desvincular_apartamento(db: AsyncSession, morador_id: str, apartamento_id: str) -> None:
    result = await db.execute(
        select(ApartamentoMorador).where(
            ApartamentoMorador.morador_id == morador_id,
            ApartamentoMorador.apartamento_id == apartamento_id,
        )
    )
    vinculo = result.scalar_one_or_none()
    if vinculo:
        await db.delete(vinculo)
        await db.commit()
