from datetime import date
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
    db.add(morador)
    await db.flush()

    if apartamento_id:
        if str(morador.tipo) == "proprietario":
            apto_res = await db.execute(select(Apartamento).where(Apartamento.id == apartamento_id))
            apto = apto_res.scalar_one_or_none()
            if apto:
                apto.proprietario_id = morador.id
                if definir_como_responsavel or apto.responsavel_id is None:
                    apto.responsavel_id = morador.id
        else:
            vinculo = ApartamentoMorador(
                morador_id=morador.id,
                apartamento_id=apartamento_id,
                data_inicio=date.today(),
            )
            db.add(vinculo)
            if definir_como_responsavel:
                apto_res = await db.execute(select(Apartamento).where(Apartamento.id == apartamento_id))
                apto = apto_res.scalar_one_or_none()
                if apto:
                    apto.responsavel_id = morador.id

    await db.commit()
    return await get_morador(db, str(morador.id))


async def get_morador(db: AsyncSession, morador_id: str) -> Morador:
    result = await db.execute(
        select(Morador)
        .options(
            selectinload(Morador.apartamentos).selectinload(ApartamentoMorador.apartamento),
            selectinload(Morador.apartamentos_proprietario),
            selectinload(Morador.apartamentos_responsavel),
        )
        .where(Morador.id == morador_id)
    )
    morador = result.scalar_one_or_none()
    if not morador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Morador não encontrado")
    return morador


async def list_moradores(db: AsyncSession, page: int = 1, page_size: int = 20, search: str = None, tipo: str = None):
    query = (
        select(Morador)
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


async def update_morador(db: AsyncSession, morador_id: str, data: dict) -> Morador:
    apartamento_id = data.pop("apartamento_id", None)
    definir_como_responsavel = data.pop("definir_como_responsavel", False)
    morador = await get_morador(db, morador_id)
    for key, value in data.items():
        setattr(morador, key, value)

    if apartamento_id is not None:
        if str(morador.tipo) == "proprietario":
            apto_res = await db.execute(select(Apartamento).where(Apartamento.id == apartamento_id))
            apto = apto_res.scalar_one_or_none()
            if apto:
                apto.proprietario_id = morador.id
                if definir_como_responsavel:
                    apto.responsavel_id = morador.id
        else:
            am_res = await db.execute(
                select(ApartamentoMorador).where(
                    ApartamentoMorador.morador_id == morador.id,
                    ApartamentoMorador.apartamento_id == apartamento_id,
                )
            )
            if not am_res.scalar_one_or_none():
                vinculo = ApartamentoMorador(
                    morador_id=morador.id,
                    apartamento_id=apartamento_id,
                    data_inicio=date.today(),
                )
                db.add(vinculo)
            if definir_como_responsavel:
                apto_res = await db.execute(select(Apartamento).where(Apartamento.id == apartamento_id))
                apto = apto_res.scalar_one_or_none()
                if apto:
                    apto.responsavel_id = morador.id

    await db.commit()
    return await get_morador(db, morador_id)


async def delete_morador(db: AsyncSession, morador_id: str) -> None:
    morador = await get_morador(db, morador_id)
    # Se for proprietário ou responsável de algum apartamento, desvincula
    apto_res = await db.execute(
        select(Apartamento).where(
            or_(
                Apartamento.proprietario_id == morador.id,
                Apartamento.responsavel_id == morador.id,
            )
        )
    )
    for apto in apto_res.scalars():
        if apto.proprietario_id == morador.id:
            apto.proprietario_id = None
        if apto.responsavel_id == morador.id:
            apto.responsavel_id = None

    await db.delete(morador)
    await db.commit()


async def vincular_apartamento(db: AsyncSession, morador_id: str, data: dict) -> ApartamentoMorador:
    apartamento_id = data["apartamento_id"]
    tipo_vinculo = data.get("tipo_vinculo", "residente")
    definir_como_responsavel = data.get("definir_como_responsavel", False)

    vinculo = ApartamentoMorador(
        morador_id=morador_id,
        apartamento_id=apartamento_id,
        data_inicio=data.get("data_inicio") or date.today(),
        data_fim=data.get("data_fim"),
    )
    db.add(vinculo)

    apto_res = await db.execute(select(Apartamento).where(Apartamento.id == apartamento_id))
    apto = apto_res.scalar_one_or_none()
    if apto:
        if tipo_vinculo == "proprietario":
            apto.proprietario_id = morador_id
        if definir_como_responsavel:
            apto.responsavel_id = morador_id

    await db.commit()
    return vinculo


async def desvincular_apartamento(db: AsyncSession, morador_id: str, apartamento_id: str) -> None:
    # 1. Se for proprietário ou responsável do apto, remove
    apto_res = await db.execute(
        select(Apartamento).where(
            Apartamento.id == apartamento_id,
            or_(
                Apartamento.proprietario_id == morador_id,
                Apartamento.responsavel_id == morador_id,
            ),
        )
    )
    apto = apto_res.scalar_one_or_none()
    if apto:
        if str(apto.proprietario_id) == str(morador_id):
            apto.proprietario_id = None
        if str(apto.responsavel_id) == str(morador_id):
            apto.responsavel_id = None

    # 2. Se for residente em ApartamentoMorador, remove o registro
    am_res = await db.execute(
        select(ApartamentoMorador).where(
            ApartamentoMorador.morador_id == morador_id,
            ApartamentoMorador.apartamento_id == apartamento_id,
        )
    )
    vinculo = am_res.scalar_one_or_none()
    if vinculo:
        await db.delete(vinculo)

    await db.commit()
