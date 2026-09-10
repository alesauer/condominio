from datetime import date
from dateutil.relativedelta import relativedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract
from fastapi import HTTPException, status
from app.models.receita import Receita
from app.services.auditoria_service import registrar_auditoria


async def create_receita(db: AsyncSession, data: dict, usuario=None) -> Receita:
    recorrente = data.pop("recorrente", False)
    meses_recorrencia = data.pop("meses_recorrencia", None)

    rec = Receita(**data)
    db.add(rec)
    await db.flush()

    if recorrente and meses_recorrencia and meses_recorrencia > 1:
        competencia_base = data.get("competencia", date.today())
        vencimento_base = data.get("vencimento")

        for i in range(2, meses_recorrencia + 1):
            next_competencia = competencia_base + relativedelta(months=i - 1)
            next_vencimento = vencimento_base + relativedelta(months=i - 1) if vencimento_base else None

            sub_data = dict(data)
            sub_data["competencia"] = next_competencia
            sub_data["vencimento"] = next_vencimento
            sub_data["status"] = "pendente"
            sub_data["data_recebimento"] = None

            sub_rec = Receita(**sub_data)
            db.add(sub_rec)

    await registrar_auditoria(
        db,
        acao="CRIAR",
        entidade_tipo="receitas",
        entidade_id=rec.id,
        dados_novos={"descricao": rec.descricao, "valor": float(rec.valor), "tipo": str(rec.tipo), "recorrente": recorrente, "meses": meses_recorrencia},
        usuario=usuario,
    )
    await db.commit()
    await db.refresh(rec)
    return rec



async def get_receita(db: AsyncSession, receita_id: str) -> Receita:
    result = await db.execute(select(Receita).where(Receita.id == receita_id))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receita não encontrada")
    return rec


from sqlalchemy import select, extract


async def list_receitas(db, page=1, page_size=20, competencia=None, mes=None, ano=None, tipo=None, status=None):
    query = select(Receita)
    if competencia:
        query = query.where(Receita.competencia == competencia)
    if ano:
        query = query.where(extract("year", Receita.competencia) == ano)
    if mes:
        query = query.where(extract("month", Receita.competencia) == mes)
    if tipo:
        query = query.where(Receita.tipo == tipo)
    if status:
        query = query.where(Receita.status == status)
    return query.order_by(Receita.competencia.desc())



async def update_receita(db: AsyncSession, receita_id: str, data: dict, usuario=None) -> Receita:
    rec = await get_receita(db, receita_id)
    dados_anteriores = {"descricao": rec.descricao, "valor": float(rec.valor), "status": str(rec.status)}
    for key, value in data.items():
        setattr(rec, key, value)
    await registrar_auditoria(
        db,
        acao="ATUALIZAR",
        entidade_tipo="receitas",
        entidade_id=rec.id,
        dados_anteriores=dados_anteriores,
        dados_novos={k: str(v) for k, v in data.items() if v is not None},
        usuario=usuario,
    )
    await db.commit()
    await db.refresh(rec)
    return rec


async def delete_receita(db: AsyncSession, receita_id: str, usuario=None) -> None:
    rec = await get_receita(db, receita_id)
    await registrar_auditoria(
        db,
        acao="EXCLUIR",
        entidade_tipo="receitas",
        entidade_id=rec.id,
        dados_anteriores={"descricao": rec.descricao, "valor": float(rec.valor)},
        usuario=usuario,
    )
    await db.delete(rec)
    await db.commit()


async def upload_comprovante_receita(db: AsyncSession, receita_id: str, file, data_recebimento: date = None, usuario=None) -> Receita:
    from app.models.documento import Documento
    from app.utils.file_storage import save_upload, delete_file

    rec = await get_receita(db, receita_id)
    if rec.comprovante_url:
        delete_file(rec.comprovante_url)

    file_path = await save_upload(file, "comprovantes")
    rec.comprovante_url = file_path
    rec.comprovante_nome = file.filename
    rec.status = "pago"
    rec.data_recebimento = data_recebimento or date.today()

    doc = Documento(
        nome=f"Comprovante - {rec.descricao}",
        categoria="comprovante",
        caminho_arquivo=file_path,
        tamanho_bytes=file.size,
        tipo_mime=file.content_type,
    )
    db.add(doc)

    await registrar_auditoria(
        db,
        acao="PAGAR",
        entidade_tipo="receitas",
        entidade_id=rec.id,
        dados_novos={"status": "pago", "data_recebimento": str(rec.data_recebimento), "comprovante": file.filename},
        usuario=usuario,
    )
    await db.commit()
    await db.refresh(rec)
    return rec


async def verificar_duplicacao_receitas(
    db: AsyncSession, mes_origem: int, ano_origem: int, mes_destino: int, ano_destino: int
) -> dict:
    from sqlalchemy import func

    q_origem = select(func.count(Receita.id)).where(
        extract("month", Receita.competencia) == mes_origem,
        extract("year", Receita.competencia) == ano_origem,
    )
    total_origem = (await db.execute(q_origem)).scalar() or 0

    q_destino = select(func.count(Receita.id)).where(
        extract("month", Receita.competencia) == mes_destino,
        extract("year", Receita.competencia) == ano_destino,
    )
    total_destino = (await db.execute(q_destino)).scalar() or 0

    return {
        "total_origem": total_origem,
        "total_destino": total_destino,
        "mes_origem": mes_origem,
        "ano_origem": ano_origem,
        "mes_destino": mes_destino,
        "ano_destino": ano_destino,
    }


async def duplicar_receitas_mes(
    db: AsyncSession,
    mes_origem: int,
    ano_origem: int,
    mes_destino: int,
    ano_destino: int,
    sobrescrever: bool = False,
    usuario=None,
) -> dict:
    import calendar
    from app.models.receita import StatusFinanceiro

    q_origem = select(Receita).where(
        extract("month", Receita.competencia) == mes_origem,
        extract("year", Receita.competencia) == ano_origem,
    )
    res_origem = await db.execute(q_origem)
    receitas_origem = res_origem.scalars().all()

    if not receitas_origem:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não há receitas cadastradas no mês de origem ({mes_origem:02d}/{ano_origem}).",
        )

    q_destino = select(Receita).where(
        extract("month", Receita.competencia) == mes_destino,
        extract("year", Receita.competencia) == ano_destino,
    )
    res_destino = await db.execute(q_destino)
    receitas_destino = res_destino.scalars().all()

    if receitas_destino and not sobrescrever:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existem {len(receitas_destino)} receita(s) no mês de destino ({mes_destino:02d}/{ano_destino}). Confirme a substituição para prosseguir.",
        )

    apagados = 0
    if receitas_destino and sobrescrever:
        for r_dest in receitas_destino:
            await db.delete(r_dest)
        apagados = len(receitas_destino)

    max_dias_destino = calendar.monthrange(ano_destino, mes_destino)[1]
    duplicados = 0

    for r in receitas_origem:
        dia_comp = min(r.competencia.day, max_dias_destino)
        nova_competencia = date(ano_destino, mes_destino, dia_comp)

        novo_vencimento = None
        if r.vencimento:
            dia_venc = min(r.vencimento.day, max_dias_destino)
            novo_vencimento = date(ano_destino, mes_destino, dia_venc)

        nova_rec = Receita(
            descricao=r.descricao,
            tipo=r.tipo,
            categoria=r.categoria,
            valor=r.valor,
            competencia=nova_competencia,
            vencimento=novo_vencimento,
            data_recebimento=None,
            status=StatusFinanceiro.pendente,
            observacao=r.observacao,
            apartamento_id=r.apartamento_id,
            comprovante_url=None,
            comprovante_nome=None,
        )
        db.add(nova_rec)
        duplicados += 1

    await registrar_auditoria(
        db,
        acao="DUPLICAR",
        entidade_tipo="receitas",
        entidade_id=None,
        dados_novos={
            "origem": f"{mes_origem:02d}/{ano_origem}",
            "destino": f"{mes_destino:02d}/{ano_destino}",
            "duplicados": duplicados,
            "apagados": apagados,
        },
        usuario=usuario,
    )
    await db.commit()

    return {
        "duplicados": duplicados,
        "apagados": apagados,
        "mes_origem": mes_origem,
        "ano_origem": ano_origem,
        "mes_destino": mes_destino,
        "ano_destino": ano_destino,
        "mensagem": f"{duplicados} receita(s) duplicada(s) com sucesso para {mes_destino:02d}/{ano_destino}."
        + (f" ({apagados} anteriores foram apagadas)" if apagados > 0 else ""),
    }


