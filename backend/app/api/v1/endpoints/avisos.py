from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.permissions import admin_required
from app.api.deps import get_current_user
from app.models.aviso import Aviso
from app.models.morador import Morador
from app.models.proprietario import Proprietario
from app.services.email_service import send_email
from app.services.auditoria_service import registrar_auditoria
from app.utils.pagination import paginate
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from uuid import UUID
import logging

logger = logging.getLogger("condo.avisos")
router = APIRouter()


class AvisoCreate(BaseModel):
    titulo: str
    descricao: str
    prioridade: str = "baixa"
    enviar_email: bool = False


class AvisoResponse(BaseModel):
    id: UUID
    titulo: str
    descricao: str
    prioridade: str
    data_publicacao: date
    enviar_email: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=dict, dependencies=[Depends(get_current_user)])
async def list_avisos(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Aviso).order_by(Aviso.data_publicacao.desc(), Aviso.created_at.desc())
    return await paginate(db, query, page=page, page_size=page_size)


@router.get("/{aviso_id}", response_model=AvisoResponse, dependencies=[Depends(get_current_user)])
async def get_aviso(aviso_id: str, db: AsyncSession = Depends(get_db)):
    try:
        aid = UUID(aviso_id) if isinstance(aviso_id, str) else aviso_id
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aviso não encontrado")

    r = await db.execute(select(Aviso).where(Aviso.id == aid))
    aviso = r.scalar_one_or_none()
    if not aviso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aviso não encontrado")
    return aviso


@router.post("", status_code=201, response_model=AvisoResponse)
async def create_aviso(
    data: AvisoCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(admin_required),
):
    try:
        aviso = Aviso(
            titulo=data.titulo.strip(),
            descricao=data.descricao.strip(),
            prioridade=data.prioridade,
            data_publicacao=date.today(),
            enviar_email=data.enviar_email,
        )
        db.add(aviso)
        await db.flush()

        if data.enviar_email:
            try:
                # Busca e-mails de moradores e proprietários
                m_res = await db.execute(select(Morador.email).where(Morador.email.isnot(None)))
                p_res = await db.execute(select(Proprietario.email).where(Proprietario.email.isnot(None)))
                emails = list(set([e for e in m_res.scalars().all() if e] + [e for e in p_res.scalars().all() if e]))
                if emails:
                    await send_email(
                        destinatarios=emails,
                        assunto=f"[Condomínio] {aviso.titulo}",
                        corpo_texto=f"Comunicado do Condomínio:\n\n{aviso.descricao}\n\nPrioridade: {aviso.prioridade}\nData: {date.today().strftime('%d/%m/%Y')}",
                    )
            except Exception as email_err:
                logger.warning(f"Erro ao disparar e-mail do aviso: {email_err}")

        try:
            await registrar_auditoria(
                db,
                acao="CRIAR",
                entidade_tipo="avisos",
                entidade_id=aviso.id,
                dados_novos={"titulo": aviso.titulo, "prioridade": aviso.prioridade, "enviar_email": aviso.enviar_email},
                usuario=current_user,
            )
        except Exception as audit_err:
            logger.warning(f"Erro ao registrar auditoria de aviso: {audit_err}")

        await db.commit()
        await db.refresh(aviso)
        return aviso
    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao criar aviso: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar aviso: {str(e)}",
        )


@router.put("/{aviso_id}", response_model=AvisoResponse, dependencies=[Depends(admin_required)])
async def update_aviso(aviso_id: str, data: AvisoCreate, db: AsyncSession = Depends(get_db)):
    try:
        aid = UUID(aviso_id) if isinstance(aviso_id, str) else aviso_id
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aviso não encontrado")

    r = await db.execute(select(Aviso).where(Aviso.id == aid))
    aviso = r.scalar_one_or_none()
    if not aviso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aviso não encontrado")

    aviso.titulo = data.titulo.strip()
    aviso.descricao = data.descricao.strip()
    aviso.prioridade = data.prioridade
    aviso.enviar_email = data.enviar_email
    await db.commit()
    await db.refresh(aviso)
    return aviso


@router.delete("/{aviso_id}", status_code=204, dependencies=[Depends(admin_required)])
async def delete_aviso(aviso_id: str, db: AsyncSession = Depends(get_db)):
    try:
        aid = UUID(aviso_id) if isinstance(aviso_id, str) else aviso_id
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aviso não encontrado")

    r = await db.execute(select(Aviso).where(Aviso.id == aid))
    aviso = r.scalar_one_or_none()
    if not aviso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aviso não encontrado")
    await db.delete(aviso)
    await db.commit()

