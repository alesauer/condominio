from typing import TypeVar, Generic, List
from pydantic import BaseModel
from sqlalchemy import Select, func
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


async def paginate(
    db: AsyncSession,
    query: Select,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    total_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(total_query)
    total = total_result.scalar()

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
