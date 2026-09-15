from fastapi import APIRouter, Depends, Query, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.permissions import admin_required
from app.api.deps import get_current_user
from app.models.assembleia import Assembleia
from app.models.pauta import Pauta
from app.models.ata import Ata
from app.models.documento import Documento
from app.utils.pagination import paginate
from app.utils.file_storage import save_upload, get_file_path, delete_file
from pydantic import BaseModel
from datetime import date, time
from typing import Optional, List
from uuid import UUID

router = APIRouter()


class PautaCreate(BaseModel):
    ordem: int
    descricao: str


class AssembleiaCreate(BaseModel):
    data: date
    titulo: str
    descricao: Optional[str] = None
    local: Optional[str] = None
    hora_inicio: Optional[str] = None
    hora_fim: Optional[str] = None
    pautas: List[PautaCreate] = []
    ata_conteudo: Optional[str] = None


@router.get("", dependencies=[Depends(get_current_user)])
async def list_assembleias(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Assembleia)
        .options(selectinload(Assembleia.pautas), selectinload(Assembleia.ata))
        .order_by(Assembleia.data.desc())
    )
    return await paginate(db, query, page=page, page_size=page_size)


@router.get("/{assembleia_id}", dependencies=[Depends(get_current_user)])
async def get_assembleia(assembleia_id: str, db: AsyncSession = Depends(get_db)):
    try:
        aid = UUID(assembleia_id) if isinstance(assembleia_id, str) else assembleia_id
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    r = await db.execute(
        select(Assembleia)
        .options(selectinload(Assembleia.pautas), selectinload(Assembleia.ata))
        .where(Assembleia.id == aid)
    )
    assembleia = r.scalar_one_or_none()
    if not assembleia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")
    return assembleia


@router.post("", status_code=201, dependencies=[Depends(admin_required)])
async def create_assembleia(data: AssembleiaCreate, db: AsyncSession = Depends(get_db)):
    a = Assembleia(data=data.data, titulo=data.titulo, descricao=data.descricao, local=data.local)
    if data.hora_inicio:
        a.hora_inicio = time.fromisoformat(data.hora_inicio)
    if data.hora_fim:
        a.hora_fim = time.fromisoformat(data.hora_fim)
    db.add(a)
    await db.flush()

    for p in data.pautas:
        db.add(Pauta(assembleia_id=a.id, ordem=p.ordem, descricao=p.descricao))

    if data.ata_conteudo:
        db.add(Ata(assembleia_id=a.id, conteudo=data.ata_conteudo))

    await db.commit()

    r = await db.execute(
        select(Assembleia)
        .options(selectinload(Assembleia.pautas), selectinload(Assembleia.ata))
        .where(Assembleia.id == a.id)
    )
    return r.scalar_one()


@router.put("/{assembleia_id}", dependencies=[Depends(admin_required)])
async def update_assembleia(assembleia_id: str, data: AssembleiaCreate, db: AsyncSession = Depends(get_db)):
    try:
        aid = UUID(assembleia_id) if isinstance(assembleia_id, str) else assembleia_id
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    r = await db.execute(
        select(Assembleia)
        .options(selectinload(Assembleia.pautas), selectinload(Assembleia.ata))
        .where(Assembleia.id == aid)
    )
    a = r.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    a.data = data.data
    a.titulo = data.titulo
    a.descricao = data.descricao
    a.local = data.local
    if data.hora_inicio:
        a.hora_inicio = time.fromisoformat(data.hora_inicio)
    if data.hora_fim:
        a.hora_fim = time.fromisoformat(data.hora_fim)

    if data.ata_conteudo is not None:
        if a.ata:
            a.ata.conteudo = data.ata_conteudo
        elif data.ata_conteudo:
            db.add(Ata(assembleia_id=a.id, conteudo=data.ata_conteudo))

    await db.commit()

    r = await db.execute(
        select(Assembleia)
        .options(selectinload(Assembleia.pautas), selectinload(Assembleia.ata))
        .where(Assembleia.id == a.id)
    )
    return r.scalar_one()


@router.post("/{assembleia_id}/ata", status_code=200, dependencies=[Depends(admin_required)])
async def upload_ata_assembleia(
    assembleia_id: str,
    file: Optional[UploadFile] = File(None),
    conteudo: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        aid = UUID(assembleia_id) if isinstance(assembleia_id, str) else assembleia_id
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    r = await db.execute(select(Assembleia).options(selectinload(Assembleia.ata)).where(Assembleia.id == aid))
    assembleia = r.scalar_one_or_none()
    if not assembleia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    file_path = None
    if file and file.filename:
        file_path = await save_upload(file, "atas")
        # Registra no acervo de Documentos
        doc = Documento(
            nome=f"Ata - {assembleia.titulo} ({assembleia.data.strftime('%d/%m/%Y')})",
            descricao=f"Ata e anexos da assembleia realizada em {assembleia.data.strftime('%d/%m/%Y')}",
            categoria="ata",
            caminho_arquivo=file_path,
            tamanho_bytes=file.size,
            tipo_mime=file.content_type,
        )
        db.add(doc)

    ata = assembleia.ata
    if ata:
        if file_path:
            if ata.arquivo_path:
                delete_file(ata.arquivo_path)
            ata.arquivo_path = file_path
        if conteudo is not None:
            ata.conteudo = conteudo
    else:
        ata = Ata(
            assembleia_id=aid,
            conteudo=conteudo or "",
            arquivo_path=file_path,
        )
        db.add(ata)

    await db.commit()
    await db.refresh(ata)
    return ata


@router.get("/{assembleia_id}/ata/download", dependencies=[Depends(get_current_user)])
async def download_ata_assembleia(assembleia_id: str, db: AsyncSession = Depends(get_db)):
    try:
        aid = UUID(assembleia_id) if isinstance(assembleia_id, str) else assembleia_id
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    r = await db.execute(
        select(Assembleia)
        .options(selectinload(Assembleia.ata))
        .where(Assembleia.id == aid)
    )
    assembleia = r.scalar_one_or_none()
    if not assembleia or not assembleia.ata or not assembleia.ata.arquivo_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ata ou arquivo anexo não encontrado")

    path = get_file_path(assembleia.ata.arquivo_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo físico não encontrado no servidor")

    ext = path.suffix or ".pdf"
    safe_titulo = "".join(c for c in assembleia.titulo if c.isalnum() or c in (" ", "-", "_")).strip()
    download_filename = f"Ata_{assembleia.data}_{safe_titulo}{ext}"

    return FileResponse(
        path,
        filename=download_filename,
        media_type="application/octet-stream",
    )


@router.delete("/{assembleia_id}/ata", status_code=204, dependencies=[Depends(admin_required)])
async def delete_ata_assembleia(assembleia_id: str, db: AsyncSession = Depends(get_db)):
    try:
        aid = UUID(assembleia_id) if isinstance(assembleia_id, str) else assembleia_id
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    r = await db.execute(select(Ata).where(Ata.assembleia_id == aid))
    ata = r.scalar_one_or_none()
    if not ata:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ata não encontrada")

    if ata.arquivo_path:
        delete_file(ata.arquivo_path)

    await db.delete(ata)
    await db.commit()


@router.delete("/{assembleia_id}", status_code=204, dependencies=[Depends(admin_required)])
async def delete_assembleia(assembleia_id: str, db: AsyncSession = Depends(get_db)):
    try:
        aid = UUID(assembleia_id) if isinstance(assembleia_id, str) else assembleia_id
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    r = await db.execute(select(Assembleia.id).where(Assembleia.id == aid))
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    try:
        # Se houver arquivo anexo na ata, limpa o arquivo físico
        ata_r = await db.execute(select(Ata.arquivo_path).where(Ata.assembleia_id == aid))
        ata_file = ata_r.scalar_one_or_none()
        if ata_file:
            delete_file(ata_file)

        # Exclui registros filhos explicitamente (pautas e atas) para evitar qualquer violação de FK
        await db.execute(delete(Pauta).where(Pauta.assembleia_id == aid))
        await db.execute(delete(Ata).where(Ata.assembleia_id == aid))
        # Exclui a assembleia diretamente via SQL eliminando problemas de StaleDataError no ORM
        await db.execute(delete(Assembleia).where(Assembleia.id == aid))
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro ao excluir assembleia: {str(e)}")


