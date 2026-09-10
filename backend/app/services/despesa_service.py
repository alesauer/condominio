from datetime import date
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.despesa import Despesa
from app.models.despesa_parcela import DespesaParcela
from app.services.auditoria_service import registrar_auditoria


async def create_despesa(db: AsyncSession, data: dict, usuario=None) -> Despesa:
    parcelamento = data.pop("parcelamento", False)
    total_parcelas = data.pop("total_parcelas", None)
    recorrente = data.pop("recorrente", False)
    meses_recorrencia = data.pop("meses_recorrencia", None)

    desp = Despesa(parcelamento=parcelamento, total_parcelas=total_parcelas, **data)
    db.add(desp)
    await db.flush()

    if parcelamento and total_parcelas and total_parcelas > 1:
        valor_total = Decimal(str(data["valor"]))
        valor_parcela = (valor_total / Decimal(str(total_parcelas))).quantize(Decimal("0.01"))
        competencia_base = data.get("competencia", date.today())

        soma_parcelas = Decimal("0.00")
        for i in range(1, total_parcelas + 1):
            if i == total_parcelas:
                # Ajusta eventual centavo de arredondamento na última parcela
                valor_ajustado = valor_total - soma_parcelas
            else:
                valor_ajustado = valor_parcela
                soma_parcelas += valor_parcela

            parcela_competencia = competencia_base + relativedelta(months=i - 1)
            parcela = DespesaParcela(
                despesa_id=desp.id,
                numero_parcela=i,
                valor=valor_ajustado,
                competencia=parcela_competencia,
                vencimento=data.get("vencimento"),
                status="pendente",
            )
            db.add(parcela)
    elif recorrente and meses_recorrencia and meses_recorrencia > 1:
        competencia_base = data.get("competencia", date.today())
        vencimento_base = data.get("vencimento")

        for i in range(2, meses_recorrencia + 1):
            next_competencia = competencia_base + relativedelta(months=i - 1)
            next_vencimento = vencimento_base + relativedelta(months=i - 1) if vencimento_base else None

            sub_data = dict(data)
            sub_data["competencia"] = next_competencia
            sub_data["vencimento"] = next_vencimento
            sub_data["status"] = "pendente"
            sub_data["data_pagamento"] = None
            sub_data["parcelamento"] = False
            sub_data["total_parcelas"] = None

            sub_desp = Despesa(**sub_data)
            db.add(sub_desp)

    await registrar_auditoria(
        db,
        acao="CRIAR",
        entidade_tipo="despesas",
        entidade_id=desp.id,
        dados_novos={"descricao": desp.descricao, "valor": float(desp.valor), "tipo": str(desp.tipo), "recorrente": recorrente, "meses": meses_recorrencia},
        usuario=usuario,
    )
    await db.commit()
    await db.refresh(desp)
    return desp



async def get_despesa(db: AsyncSession, despesa_id: str) -> Despesa:
    result = await db.execute(select(Despesa).where(Despesa.id == despesa_id))
    desp = result.scalar_one_or_none()
    if not desp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Despesa não encontrada")
    return desp


from sqlalchemy import select, extract


async def list_despesas(db, page=1, page_size=20, competencia=None, mes=None, ano=None, tipo=None, status=None):
    query = select(Despesa)
    if competencia:
        query = query.where(Despesa.competencia == competencia)
    if ano:
        query = query.where(extract("year", Despesa.competencia) == ano)
    if mes:
        query = query.where(extract("month", Despesa.competencia) == mes)
    if tipo:
        query = query.where(Despesa.tipo == tipo)
    if status:
        query = query.where(Despesa.status == status)
    return query.order_by(Despesa.competencia.desc())



async def update_despesa(db: AsyncSession, despesa_id: str, data: dict, usuario=None) -> Despesa:
    desp = await get_despesa(db, despesa_id)
    dados_anteriores = {"descricao": desp.descricao, "valor": float(desp.valor), "status": str(desp.status)}
    for key, value in data.items():
        setattr(desp, key, value)
    await registrar_auditoria(
        db,
        acao="ATUALIZAR",
        entidade_tipo="despesas",
        entidade_id=desp.id,
        dados_anteriores=dados_anteriores,
        dados_novos={k: str(v) for k, v in data.items() if v is not None},
        usuario=usuario,
    )
    await db.commit()
    await db.refresh(desp)
    return desp


async def delete_despesa(db: AsyncSession, despesa_id: str, usuario=None) -> None:
    desp = await get_despesa(db, despesa_id)
    await registrar_auditoria(
        db,
        acao="EXCLUIR",
        entidade_tipo="despesas",
        entidade_id=desp.id,
        dados_anteriores={"descricao": desp.descricao, "valor": float(desp.valor)},
        usuario=usuario,
    )
    await db.delete(desp)
    await db.commit()


async def upload_comprovante_despesa(db: AsyncSession, despesa_id: str, file, data_pagamento: date = None, usuario=None) -> Despesa:
    from app.models.documento import Documento
    from app.utils.file_storage import save_upload, delete_file

    desp = await get_despesa(db, despesa_id)
    if desp.comprovante_url:
        delete_file(desp.comprovante_url)

    file_path = await save_upload(file, "comprovantes")
    desp.comprovante_url = file_path
    desp.comprovante_nome = file.filename
    desp.status = "pago"
    desp.data_pagamento = data_pagamento or date.today()

    doc = Documento(
        nome=f"Comprovante - {desp.descricao}",
        categoria="comprovante",
        caminho_arquivo=file_path,
        tamanho_bytes=file.size,
        tipo_mime=file.content_type,
    )
    db.add(doc)

    await registrar_auditoria(
        db,
        acao="PAGAR",
        entidade_tipo="despesas",
        entidade_id=desp.id,
        dados_novos={"status": "pago", "data_pagamento": str(desp.data_pagamento), "comprovante": file.filename},
        usuario=usuario,
    )
    await db.commit()
    await db.refresh(desp)
    return desp

