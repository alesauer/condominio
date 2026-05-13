from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.cobranca import Cobranca
from app.models.apartamento import Apartamento


async def list_cobrancas(db, page=1, page_size=20, apartamento_id=None, competencia=None, status=None):
    query = select(Cobranca)
    if apartamento_id:
        query = query.where(Cobranca.apartamento_id == apartamento_id)
    if competencia:
        query = query.where(Cobranca.competencia == competencia)
    if status:
        query = query.where(Cobranca.status == status)
    return query.order_by(Cobranca.vencimento.desc())


async def get_cobranca(db: AsyncSession, cobranca_id: str) -> Cobranca:
    result = await db.execute(select(Cobranca).where(Cobranca.id == cobranca_id))
    cob = result.scalar_one_or_none()
    if not cob:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cobrança não encontrada")
    return cob


async def pagar_cobranca(db: AsyncSession, cobranca_id: str) -> Cobranca:
    cob = await get_cobranca(db, cobranca_id)
    cob.status = "pago"
    cob.data_pagamento = date.today()
    await db.commit()
    await db.refresh(cob)
    return cob
