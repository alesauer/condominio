from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import admin_required
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse
from app.schemas.common import PaginatedResponse
from app.services import usuario_service
from app.utils.pagination import paginate

router = APIRouter()


@router.get("", response_model=PaginatedResponse[UsuarioResponse], dependencies=[Depends(admin_required)])
async def list_usuarios(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = await usuario_service.list_usuarios(db, page=page, page_size=page_size, search=search)
    result = await paginate(db, query, page=page, page_size=page_size)
    return result


@router.get("/{usuario_id}", response_model=UsuarioResponse, dependencies=[Depends(admin_required)])
async def get_usuario(usuario_id: str, db: AsyncSession = Depends(get_db)):
    return await usuario_service.get_usuario(db, usuario_id)


@router.post("", response_model=UsuarioResponse, status_code=201, dependencies=[Depends(admin_required)])
async def create_usuario(data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    return await usuario_service.create_usuario(db, data.model_dump())


@router.put("/{usuario_id}", response_model=UsuarioResponse, dependencies=[Depends(admin_required)])
async def update_usuario(usuario_id: str, data: UsuarioUpdate, db: AsyncSession = Depends(get_db)):
    return await usuario_service.update_usuario(db, usuario_id, data.model_dump(exclude_unset=True))


@router.delete("/{usuario_id}", status_code=204, dependencies=[Depends(admin_required)])
async def delete_usuario(usuario_id: str, db: AsyncSession = Depends(get_db)):
    await usuario_service.delete_usuario(db, usuario_id)
