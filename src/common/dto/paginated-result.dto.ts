export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Returned by service methods for list endpoints. The ResponseInterceptor
 * recognizes this shape and unwraps it into the { data, meta } envelope
 * instead of the plain { data, message } one.
 */
export class PaginatedResult<T> {
  constructor(
    public readonly items: T[],
    public readonly meta: PaginationMeta,
  ) {}
}
