from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from fastapi import HTTPException, status
from app.models.proprietario import Proprietario
from app.models.apartamento_proprietario import ApartamentoProprietario


async def create_proprietario(db: AsyncSession, data: dict) -> Proprietario:
    result = await db.execute(select(Proprietario).where(Proprietario.cpf == data["cpf"]))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF já cadastrado")
    prop = Proprietario(**data)
    db.add(prop)
    await db.commit()
    await db.refresh(prop)
    return prop


async def get_proprietario(db: AsyncSession, proprietario_id: str) -> Proprietario:
    result = await db.execute(select(Proprietario).where(Proprietario.id == proprietario_id))
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proprietário não encontrado")
    return prop


async def list_proprietarios(db: AsyncSession, page: int = 1, page_size: int = 20, search: str = None):
    query = select(Proprietario)
    if search:
        query = query.where(
            or_(Proprietario.nome.ilike(f"%{search}%"), Proprietario.cpf.ilike(f"%{search}%"))
        )
    query = query.order_by(Proprietario.nome)
    return query


async def update_proprietario(db: AsyncSession, proprietario_id: str, data: dict) -> Proprietario:
    prop = await get_proprietario(db, proprietario_id)
    for key, value in data.items():
        if value is not None:
            setattr(prop, key, value)
    await db.commit()
    await db.refresh(prop)
    return prop


async def delete_proprietario(db: AsyncSession, proprietario_id: str) -> None:
    prop = await get_proprietario(db, proprietario_id)
    await db.delete(prop)
    await db.commit()
