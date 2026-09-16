from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.apartamento import Apartamento
from app.services.auditoria_service import registrar_auditoria


PESOS = {"padrao": 1.0, "area_privativa": 1.5, "cobertura": 2.0}


def get_peso(tipo: str) -> float:
    return PESOS.get(tipo, 1.0)


async def create_apartamento(db: AsyncSession, data: dict, usuario=None) -> Apartamento:
    apto = Apartamento(**data)
    db.add(apto)
    await db.flush()
    await registrar_auditoria(
        db,
        acao="CRIAR",
        entidade_tipo="apartamentos",
        entidade_id=apto.id,
        dados_novos={"numero": apto.numero, "bloco": apto.bloco, "tipo": str(apto.tipo)},
        usuario=usuario,
    )
    await db.commit()
    await db.refresh(apto)
    return apto


async def get_apartamento(db: AsyncSession, apartamento_id: str | UUID) -> Apartamento:
    aid = UUID(str(apartamento_id))
    result = await db.execute(
        select(Apartamento)
        .execution_options(populate_existing=True)
        .options(
            selectinload(Apartamento.proprietario),
            selectinload(Apartamento.responsavel),
        )
        .where(Apartamento.id == aid)
    )
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
    query = (
        select(Apartamento)
        .execution_options(populate_existing=True)
        .options(
            selectinload(Apartamento.proprietario),
            selectinload(Apartamento.responsavel),
        )
    )
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


async def update_apartamento(db: AsyncSession, apartamento_id: str, data: dict, usuario=None) -> Apartamento:
    apto = await get_apartamento(db, apartamento_id)
    dados_anteriores = {"numero": apto.numero, "bloco": apto.bloco, "status": str(apto.status)}
    for key, value in data.items():
        setattr(apto, key, value)
    await registrar_auditoria(
        db,
        acao="ATUALIZAR",
        entidade_tipo="apartamentos",
        entidade_id=apto.id,
        dados_anteriores=dados_anteriores,
        dados_novos=data,
        usuario=usuario,
    )
    await db.commit()
    await db.refresh(apto)
    return apto


async def delete_apartamento(db: AsyncSession, apartamento_id: str, usuario=None) -> None:
    apto = await get_apartamento(db, apartamento_id)
    await registrar_auditoria(
        db,
        acao="EXCLUIR",
        entidade_tipo="apartamentos",
        entidade_id=apto.id,
        dados_anteriores={"numero": apto.numero, "bloco": apto.bloco},
        usuario=usuario,
    )
    await db.delete(apto)
    await db.commit()
