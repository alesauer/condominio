from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.receita import Receita


async def create_receita(db: AsyncSession, data: dict) -> Receita:
    rec = Receita(**data)
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec


async def get_receita(db: AsyncSession, receita_id: str) -> Receita:
    result = await db.execute(select(Receita).where(Receita.id == receita_id))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receita não encontrada")
    return rec


async def list_receitas(db, page=1, page_size=20, competencia=None, tipo=None, status=None):
    query = select(Receita)
    if competencia:
        query = query.where(Receita.competencia == competencia)
    if tipo:
        query = query.where(Receita.tipo == tipo)
    if status:
        query = query.where(Receita.status == status)
    return query.order_by(Receita.competencia.desc())


async def update_receita(db: AsyncSession, receita_id: str, data: dict) -> Receita:
    rec = await get_receita(db, receita_id)
    for key, value in data.items():
        if value is not None:
            setattr(rec, key, value)
    await db.commit()
    await db.refresh(rec)
    return rec


async def delete_receita(db: AsyncSession, receita_id: str) -> None:
    rec = await get_receita(db, receita_id)
    await db.delete(rec)
    await db.commit()
