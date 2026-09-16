from datetime import date
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.morador import Morador
from app.models.apartamento import Apartamento
from app.models.apartamento_morador import ApartamentoMorador


async def create_morador(db: AsyncSession, data: dict) -> Morador:
    apartamento_id = data.pop("apartamento_id", None)
    definir_como_responsavel = data.pop("definir_como_responsavel", False)
    morador = Morador(**data)
    if not morador.id:
        import uuid as _uuid
        morador.id = _uuid.uuid4()
    db.add(morador)
    await db.flush()

    if apartamento_id:
        aid = UUID(str(apartamento_id))
        mid = morador.id
        if str(morador.tipo) == "proprietario":
            apto_res = await db.execute(select(Apartamento).where(Apartamento.id == aid))
            apto = apto_res.scalar_one_or_none()
            if apto:
                apto.proprietario_id = mid
                if definir_como_responsavel or apto.responsavel_id is None:
                    apto.responsavel_id = mid
        else:
            vinculo = ApartamentoMorador(
                morador_id=mid,
                apartamento_id=aid,
                data_inicio=date.today(),
            )
            db.add(vinculo)
            if definir_como_responsavel:
                apto_res = await db.execute(select(Apartamento).where(Apartamento.id == aid))
                apto = apto_res.scalar_one_or_none()
                if apto:
                    apto.responsavel_id = mid

    await db.commit()
    return await get_morador(db, str(morador.id))


async def get_morador(db: AsyncSession, morador_id: str | UUID) -> Morador:
    mid = UUID(str(morador_id))
    result = await db.execute(
        select(Morador)
        .execution_options(populate_existing=True)
        .options(
            selectinload(Morador.apartamentos).selectinload(ApartamentoMorador.apartamento),
            selectinload(Morador.apartamentos_proprietario),
            selectinload(Morador.apartamentos_responsavel),
        )
        .where(Morador.id == mid)
    )
    morador = result.scalar_one_or_none()
    if not morador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Morador não encontrado")
    return morador


async def list_moradores(db: AsyncSession, page: int = 1, page_size: int = 20, search: str = None, tipo: str = None):
    query = (
        select(Morador)
        .execution_options(populate_existing=True)
        .options(
            selectinload(Morador.apartamentos).selectinload(ApartamentoMorador.apartamento),
            selectinload(Morador.apartamentos_proprietario),
            selectinload(Morador.apartamentos_responsavel),
        )
    )
    if search:
        query = query.where(
            or_(
                Morador.nome.ilike(f"%{search}%"),
                Morador.cpf.ilike(f"%{search}%"),
                Morador.email.ilike(f"%{search}%"),
            )
        )
    if tipo:
        query = query.where(Morador.tipo == tipo)
    query = query.order_by(Morador.nome)
    return query


async def update_morador(db: AsyncSession, morador_id: str | UUID, data: dict) -> Morador:
    mid = UUID(str(morador_id))
    apartamento_id = data.pop("apartamento_id", None)
    definir_como_responsavel = data.pop("definir_como_responsavel", False)
    morador = await get_morador(db, mid)
    for key, value in data.items():
        setattr(morador, key, value)

    if apartamento_id is not None:
        aid = UUID(str(apartamento_id))
        if str(morador.tipo) == "proprietario":
            apto_res = await db.execute(select(Apartamento).where(Apartamento.id == aid))
            apto = apto_res.scalar_one_or_none()
            if apto:
                apto.proprietario_id = mid
                if definir_como_responsavel:
                    apto.responsavel_id = mid
        else:
            am_res = await db.execute(
                select(ApartamentoMorador).where(
                    ApartamentoMorador.morador_id == mid,
                    ApartamentoMorador.apartamento_id == aid,
                )
            )
            if not am_res.scalar_one_or_none():
                vinculo = ApartamentoMorador(
                    morador_id=mid,
                    apartamento_id=aid,
                    data_inicio=date.today(),
                )
                db.add(vinculo)
            if definir_como_responsavel:
                apto_res = await db.execute(select(Apartamento).where(Apartamento.id == aid))
                apto = apto_res.scalar_one_or_none()
                if apto:
                    apto.responsavel_id = mid

    await db.commit()
    return await get_morador(db, mid)


async def delete_morador(db: AsyncSession, morador_id: str | UUID) -> None:
    mid = UUID(str(morador_id))
    morador = await get_morador(db, mid)
    # Se for proprietário ou responsável de algum apartamento, desvincula
    apto_res = await db.execute(
        select(Apartamento).where(
            or_(
                Apartamento.proprietario_id == mid,
                Apartamento.responsavel_id == mid,
            )
        )
    )
    for apto in apto_res.scalars():
        if apto.proprietario_id == mid:
            apto.proprietario_id = None
        if apto.responsavel_id == mid:
            apto.responsavel_id = None

    await db.delete(morador)
    await db.commit()


async def vincular_apartamento(db: AsyncSession, morador_id: str | UUID, data: dict) -> Morador:
    mid = UUID(str(morador_id))
    apartamento_id = data["apartamento_id"]
    aid = UUID(str(apartamento_id))
    tipo_vinculo = data.get("tipo_vinculo", "residente")
    definir_como_responsavel = data.get("definir_como_responsavel", False)
    data_inicio = data.get("data_inicio") or date.today()
    data_fim = data.get("data_fim")

    apto_res = await db.execute(select(Apartamento).where(Apartamento.id == aid))
    apto = apto_res.scalar_one_or_none()
    if not apto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Apartamento não encontrado")

    if tipo_vinculo == "proprietario":
        apto.proprietario_id = mid
        if definir_como_responsavel:
            apto.responsavel_id = mid
    else:
        am_res = await db.execute(
            select(ApartamentoMorador).where(
                ApartamentoMorador.morador_id == mid,
                ApartamentoMorador.apartamento_id == aid,
            )
        )
        am = am_res.scalar_one_or_none()
        if not am:
            vinculo = ApartamentoMorador(
                morador_id=mid,
                apartamento_id=aid,
                data_inicio=data_inicio,
                data_fim=data_fim,
            )
            db.add(vinculo)
        else:
            am.data_inicio = data_inicio
            am.data_fim = data_fim

        if definir_como_responsavel:
            apto.responsavel_id = mid

    await db.commit()
    return await get_morador(db, mid)


async def desvincular_apartamento(db: AsyncSession, morador_id: str | UUID, apartamento_id: str | UUID) -> None:
    mid = UUID(str(morador_id))
    aid = UUID(str(apartamento_id))

    # 1. Se for proprietário ou responsável do apto, remove
    apto_res = await db.execute(
        select(Apartamento).where(
            Apartamento.id == aid,
            or_(
                Apartamento.proprietario_id == mid,
                Apartamento.responsavel_id == mid,
            ),
        )
    )
    apto = apto_res.scalar_one_or_none()
    if apto:
        if apto.proprietario_id == mid:
            apto.proprietario_id = None
        if apto.responsavel_id == mid:
            apto.responsavel_id = None

    # 2. Se for residente em ApartamentoMorador, remove o registro
    am_res = await db.execute(
        select(ApartamentoMorador).where(
            ApartamentoMorador.morador_id == mid,
            ApartamentoMorador.apartamento_id == aid,
        )
    )
    for vinculo in am_res.scalars().all():
        await db.delete(vinculo)

    await db.commit()

