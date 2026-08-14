import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

/**
 * Application-level exception with a stable business error code.
 * Internal details (stack, sql, hostnames) are NEVER included in the payload.
 */
export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status: HttpStatus, details?: unknown) {
    super({ error: { code, message, requestId: '' } }, status);
    this.code = code;
    this.details = details;
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenException extends AppException {
  constructor(message = 'Insufficient permission') {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundException extends AppException {
  constructor(code: ErrorCode = 'NOT_FOUND', message = 'Resource not found') {
    super(code, message, HttpStatus.NOT_FOUND);
  }
}

export class ConflictException extends AppException {
  constructor(code: ErrorCode = 'CONFLICT', message = 'Conflict', details?: unknown) {
    super(code, message, HttpStatus.CONFLICT, details);
  }
}

export class BadRequestAppException extends AppException {
  constructor(code: ErrorCode = 'VALIDATION_FAILED', message = 'Invalid request', details?: unknown) {
    super(code, message, HttpStatus.BAD_REQUEST, details);
  }
}
