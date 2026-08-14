import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { AppException } from '../errors/app-exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId =
      (request.headers['x-request-id'] as string) ?? (request as Request & { requestId?: string }).requestId ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof AppException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = Array.isArray(b.message)
          ? (b.message as string[]).join('; ')
          : (b.message as string) ?? exception.message;
        code = b.error ? `HTTP_${String(b.error).toUpperCase()}` : 'VALIDATION_FAILED';
        details = b.message;
      }
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = 'Database operation failed';
      this.logger.error(`DB error: ${exception.message}`, exception.stack);
    } else if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      code = 'NOT_FOUND';
      message = 'Resource not found';
    } else {
      message = exception instanceof Error ? exception.message : 'Internal server error';
      this.logger.error(message, exception instanceof Error ? exception.stack : undefined);
    }

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} -> ${status} ${code}: ${message}`);
    }

    response.status(status).json({
      error: { code, message, requestId, ...(details !== undefined ? { details } : {}) },
    });
  }
}
