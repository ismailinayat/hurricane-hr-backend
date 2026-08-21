import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ErrorCode } from '../enums/error-code.enum';

interface ErrorBody {
  message: string;
  errorCode: ErrorCode;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsHandler');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status}: ${body.message}`);
    }

    response.status(status).json({
      success: false,
      message: body.message,
      errorCode: body.errorCode,
    });
  }

  private resolve(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'object' && payload !== null && 'errorCode' in payload) {
        const typed = payload as { message: string | string[]; errorCode: ErrorCode };
        return {
          status,
          body: {
            message: Array.isArray(typed.message) ? typed.message.join(', ') : typed.message,
            errorCode: typed.errorCode,
          },
        };
      }

      if (typeof payload === 'object' && payload !== null && 'message' in payload) {
        const typed = payload as { message: string | string[] };
        return {
          status,
          body: {
            message: Array.isArray(typed.message) ? typed.message.join(', ') : typed.message,
            errorCode:
              status === 400 ? ErrorCode.VALIDATION_ERROR : this.errorCodeForStatus(status),
          },
        };
      }

      return {
        status,
        body: { message: exception.message, errorCode: this.errorCodeForStatus(status) },
      };
    }

    if (exception instanceof QueryFailedError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          message: 'The request could not be processed due to a data conflict.',
          errorCode: ErrorCode.VALIDATION_ERROR,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { message: 'Internal server error', errorCode: ErrorCode.INTERNAL_ERROR },
    };
  }

  private errorCodeForStatus(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
