from typing import TypeVar, Generic, List, Optional
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class FilterParams(BaseModel):
    search: Optional[str] = None
    page: int = 1
    page_size: int = 20
    order_by: Optional[str] = None
    order_dir: Optional[str] = "asc"
