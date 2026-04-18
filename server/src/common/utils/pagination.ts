export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  skip: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function buildPagination(params: PaginationParams = {}): PaginationMeta {
  const page = Math.max(DEFAULT_PAGE, Math.trunc(params.page ?? DEFAULT_PAGE));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(params.limit ?? DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function buildPaginationResult<T>(items: T[], totalItems: number, meta: PaginationMeta) {
  return {
    items,
    pagination: {
      page: meta.page,
      limit: meta.limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / meta.limit),
    },
  };
}
