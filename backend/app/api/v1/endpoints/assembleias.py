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
from app.schemas.assembleia import (
    AssembleiaCreate,
    AssembleiaUpdate,
    AssembleiaResponse,
    AtaResponse,
)
from app.schemas.common import PaginatedResponse
from app.utils.pagination import paginate
from app.utils.file_storage import save_upload, get_file_path, delete_file
from datetime import time
from typing import Optional
from uuid import UUID
import mimetypes
import logging

logger = logging.getLogger("condo.assembleias")
router = APIRouter()


def parse_time_safe(val: Optional[str]) -> Optional[time]:
    if not val or not str(val).strip():
        return None
    try:
        val_clean = str(val).strip()
        parts = val_clean.split(":")
        if len(parts) >= 2:
            hour = int(parts[0])
            minute = int(parts[1])
            second = int(parts[2]) if len(parts) > 2 else 0
            return time(hour, minute, second)
        return time.fromisoformat(val_clean)
    except Exception:
        return None


@router.get("", response_model=PaginatedResponse[AssembleiaResponse], dependencies=[Depends(get_current_user)])
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


@router.get("/{assembleia_id}", response_model=AssembleiaResponse, dependencies=[Depends(get_current_user)])
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


@router.post("", response_model=AssembleiaResponse, status_code=201, dependencies=[Depends(admin_required)])
async def create_assembleia(data: AssembleiaCreate, db: AsyncSession = Depends(get_db)):
    try:
        a = Assembleia(
            data=data.data,
            titulo=data.titulo,
            descricao=data.descricao,
            local=data.local,
            hora_inicio=parse_time_safe(data.hora_inicio),
            hora_fim=parse_time_safe(data.hora_fim),
        )
        db.add(a)
        await db.flush()

        for p in data.pautas:
            if p.descricao and p.descricao.strip():
                db.add(Pauta(assembleia_id=a.id, ordem=p.ordem, descricao=p.descricao.strip()))

        if data.ata_conteudo and data.ata_conteudo.strip():
            db.add(Ata(assembleia_id=a.id, conteudo=data.ata_conteudo.strip()))

        await db.commit()

        r = await db.execute(
            select(Assembleia)
            .options(selectinload(Assembleia.pautas), selectinload(Assembleia.ata))
            .where(Assembleia.id == a.id)
        )
        return r.scalar_one()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao criar assembleia: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar assembleia: {str(e)}"
        )


@router.put("/{assembleia_id}", response_model=AssembleiaResponse, dependencies=[Depends(admin_required)])
async def update_assembleia(assembleia_id: str, data: AssembleiaUpdate, db: AsyncSession = Depends(get_db)):
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

    try:
        if data.data is not None:
            a.data = data.data
        if data.titulo is not None:
            a.titulo = data.titulo
        if data.descricao is not None:
            a.descricao = data.descricao
        if data.local is not None:
            a.local = data.local
        if data.hora_inicio is not None:
            a.hora_inicio = parse_time_safe(data.hora_inicio)
        if data.hora_fim is not None:
            a.hora_fim = parse_time_safe(data.hora_fim)

        if data.pautas is not None:
            await db.execute(delete(Pauta).where(Pauta.assembleia_id == aid))
            for p in data.pautas:
                if p.descricao and p.descricao.strip():
                    db.add(Pauta(assembleia_id=a.id, ordem=p.ordem, descricao=p.descricao.strip()))

        if data.ata_conteudo is not None:
            if a.ata:
                a.ata.conteudo = data.ata_conteudo
            elif data.ata_conteudo.strip():
                db.add(Ata(assembleia_id=a.id, conteudo=data.ata_conteudo.strip()))

        await db.commit()

        r = await db.execute(
            select(Assembleia)
            .options(selectinload(Assembleia.pautas), selectinload(Assembleia.ata))
            .where(Assembleia.id == a.id)
        )
        return r.scalar_one()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao atualizar assembleia {aid}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar assembleia: {str(e)}"
        )


@router.post("/{assembleia_id}/ata", response_model=AtaResponse, status_code=200, dependencies=[Depends(admin_required)])
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

    try:
        file_path = None
        if file and file.filename:
            file_path = await save_upload(file, "atas")
            # Registra no acervo de Documentos
            try:
                doc = Documento(
                    nome=f"Ata - {assembleia.titulo} ({assembleia.data.strftime('%d/%m/%Y')})",
                    descricao=f"Ata e anexos da assembleia realizada em {assembleia.data.strftime('%d/%m/%Y')}",
                    categoria="atas",
                    caminho_arquivo=file_path,
                    tamanho_bytes=file.size or 0,
                    tipo_mime=file.content_type,
                )
                db.add(doc)
            except Exception as doc_err:
                logger.warning(f"Erro ao registrar documento no acervo: {doc_err}")

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
    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao salvar ata da assembleia {aid}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar ata: {str(e)}"
        )


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


@router.get("/{assembleia_id}/ata/view", dependencies=[Depends(get_current_user)])
async def view_ata_assembleia(assembleia_id: str, db: AsyncSession = Depends(get_db)):
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

    ext = path.suffix.lower()
    mime_type, _ = mimetypes.guess_type(str(path))
    if not mime_type:
        if ext == ".pdf":
            mime_type = "application/pdf"
        elif ext in [".png", ".jpg", ".jpeg", ".webp"]:
            mime_type = f"image/{ext.replace('.', '')}"
        else:
            mime_type = "application/octet-stream"

    safe_titulo = "".join(c for c in assembleia.titulo if c.isalnum() or c in (" ", "-", "_")).strip()
    filename = f"Ata_{assembleia.data}_{safe_titulo}{ext}"

    return FileResponse(
        path,
        media_type=mime_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.delete("/{assembleia_id}/ata/file", response_model=AtaResponse, dependencies=[Depends(admin_required)])
async def delete_ata_file(assembleia_id: str, db: AsyncSession = Depends(get_db)):
    try:
        aid = UUID(assembleia_id) if isinstance(assembleia_id, str) else assembleia_id
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembleia não encontrada")

    r = await db.execute(select(Ata).where(Ata.assembleia_id == aid))
    ata = r.scalar_one_or_none()
    if not ata or not ata.arquivo_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nenhum arquivo anexado nesta ata")

    delete_file(ata.arquivo_path)
    ata.arquivo_path = None
    await db.commit()
    await db.refresh(ata)
    return ata


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



