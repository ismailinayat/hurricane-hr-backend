import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginatedResult } from '../dto/paginated-result.dto';

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginatedResult<T>['meta'];
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T> | PaginatedResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T> | PaginatedResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        if (result instanceof PaginatedResult) {
          return { success: true, data: result.items, meta: result.meta };
        }
        return { success: true, data: result, message: 'Operation completed successfully' };
      }),
    );
  }
}
