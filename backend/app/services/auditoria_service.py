import uuid
from typing import Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.auditoria import Auditoria
from app.models.usuario import Usuario


async def registrar_auditoria(
    db: AsyncSession,
    acao: str,
    entidade_tipo: str,
    entidade_id: Optional[Any] = None,
    dados_anteriores: Optional[Dict[str, Any]] = None,
    dados_novos: Optional[Dict[str, Any]] = None,
    usuario: Optional[Usuario] = None,
    ip_origem: Optional[str] = None,
) -> Auditoria:
    """
    Registra um log de auditoria no sistema.
    """
    uid = None
    if entidade_id:
        if isinstance(entidade_id, uuid.UUID):
            uid = entidade_id
        else:
            try:
                uid = uuid.UUID(str(entidade_id))
            except (ValueError, TypeError):
                uid = None

    usuario_id = usuario.id if usuario else None
    usuario_nome = usuario.nome if usuario else "Sistema"

    log = Auditoria(
        usuario_id=usuario_id,
        usuario_nome=usuario_nome,
        acao=acao,
        entidade_tipo=entidade_tipo,
        entidade_id=uid,
        dados_anteriores=dados_anteriores,
        dados_novos=dados_novos,
        ip_origem=ip_origem,
    )
    db.add(log)
    return log
