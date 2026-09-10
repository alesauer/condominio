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

