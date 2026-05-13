from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pathlib import Path
from app.core.database import get_db
from app.core.config import settings
from app.core.permissions import admin_required
from app.models.documento import Documento
from app.utils.pagination import paginate
from app.utils.file_storage import save_upload, get_file_path

router = APIRouter()


@router.get("")
async def list_documentos(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), categoria: str = Query(None), db: AsyncSession = Depends(get_db)):
    query = select(Documento)
    if categoria: query = query.where(Documento.categoria == categoria)
    return await paginate(db, query.order_by(Documento.created_at.desc()), page=page, page_size=page_size)


@router.post("", status_code=201, dependencies=[Depends(admin_required)])
async def upload_documento(
    file: UploadFile = File(...),
    nome: str = Form(...),
    categoria: str = Form("outros"),
    db: AsyncSession = Depends(get_db),
):
    file_path = await save_upload(file, "documentos")
    doc = Documento(nome=nome, categoria=categoria, caminho_arquivo=file_path, tamanho_bytes=file.size, tipo_mime=file.content_type)
    db.add(doc); await db.commit(); await db.refresh(doc)
    return doc


@router.get("/{documento_id}/download")
async def download_documento(documento_id: str, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Documento).where(Documento.id == documento_id))
    doc = r.scalar_one_or_none()
    if not doc: return {"detail": "Not found"}
    path = get_file_path(doc.caminho_arquivo)
    return FileResponse(path, filename=doc.nome, media_type=doc.tipo_mime or "application/octet-stream")


@router.delete("/{documento_id}", status_code=204, dependencies=[Depends(admin_required)])
async def delete_documento(documento_id: str, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Documento).where(Documento.id == documento_id))
    doc = r.scalar_one()
    await db.delete(doc); await db.commit()
