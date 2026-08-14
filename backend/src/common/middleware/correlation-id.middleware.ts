import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

export type CorrelatedRequest = Request & { requestId: string; correlationId: string };

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private static readonly instance = new CorrelationIdMiddleware();

  static apply() {
    return CorrelationIdMiddleware.instance.use.bind(CorrelationIdMiddleware.instance);
  }

  use(req: CorrelatedRequest, res: Response, next: () => void): void {
    const inbound = req.headers['x-request-id'] ?? req.headers['x-correlation-id'];
    const id = typeof inbound === 'string' && inbound.length > 0 ? inbound : randomUUID();
    res.setHeader('x-request-id', id);
    req.requestId = id;
    req.correlationId = id;
    next();
  }
}
