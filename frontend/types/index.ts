export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface FilterParams {
  search?: string;
  page?: number;
  page_size?: number;
  order_by?: string;
  order_dir?: "asc" | "desc";
}
