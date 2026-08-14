import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { CorrelatedRequest } from '../middleware/correlation-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<CorrelatedRequest>();
    const response = http.getResponse<Response>();
    const start = Date.now();
    const { method, originalUrl } = request;
    const requestId = request.requestId ?? 'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `${method} ${originalUrl} ${response.statusCode} ${Date.now() - start}ms rid=${requestId}`,
          );
        },
        error: (err: { status?: number }) => {
          this.logger.warn(
            `${method} ${originalUrl} ${err.status ?? 500} ${Date.now() - start}ms rid=${requestId}`,
          );
        },
      }),
    );
  }
}
