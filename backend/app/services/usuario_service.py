from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.usuario import Usuario
from app.core.security import hash_password


async def create_usuario(db: AsyncSession, data: dict) -> Usuario:
    result = await db.execute(select(Usuario).where(Usuario.email == data["email"]))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já cadastrado")

    usuario = Usuario(
        nome=data["nome"],
        email=data["email"],
        senha_hash=hash_password(data["password"]),
        role=data.get("role", "morador"),
    )
    db.add(usuario)
    await db.commit()
    await db.refresh(usuario)
    return usuario


async def get_usuario(db: AsyncSession, usuario_id: str) -> Usuario:
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return usuario


async def list_usuarios(db: AsyncSession, page: int = 1, page_size: int = 20, search: str = None):
    query = select(Usuario)
    if search:
        query = query.where(Usuario.nome.ilike(f"%{search}%") | Usuario.email.ilike(f"%{search}%"))
    query = query.order_by(Usuario.nome)
    return query


async def update_usuario(db: AsyncSession, usuario_id: str, data: dict) -> Usuario:
    usuario = await get_usuario(db, usuario_id)
    for key, value in data.items():
        if value is not None:
            setattr(usuario, key, value)
    await db.commit()
    await db.refresh(usuario)
    return usuario


async def delete_usuario(db: AsyncSession, usuario_id: str) -> None:
    usuario = await get_usuario(db, usuario_id)
    await db.delete(usuario)
    await db.commit()
