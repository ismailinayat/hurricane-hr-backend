import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum';

/**
 * Carries a stable machine-readable errorCode alongside the HTTP status so
 * clients can branch on business rules instead of parsing message strings.
 */
export class AppException extends HttpException {
  constructor(message: string, errorCode: ErrorCode, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ message, errorCode }, status);
  }
}
