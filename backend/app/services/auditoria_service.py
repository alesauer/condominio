import uuid
from typing import Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.auditoria import Auditoria
from app.models.usuario import Usuario


def _sanitize_json(obj: Any) -> Any:
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {str(k): _sanitize_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [_sanitize_json(x) for x in obj]
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    if hasattr(obj, "value"):  # Enum
        return obj.value
    return obj


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
        dados_anteriores=_sanitize_json(dados_anteriores),
        dados_novos=_sanitize_json(dados_novos),
        ip_origem=ip_origem,
    )
    db.add(log)
    return log
