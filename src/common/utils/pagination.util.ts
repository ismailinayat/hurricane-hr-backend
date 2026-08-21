import { PaginatedResult } from '../dto/paginated-result.dto';

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return new PaginatedResult(items, { page, limit, total, totalPages });
}
