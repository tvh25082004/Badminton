import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { EnvService } from '../../common/config/env.service';
import { BadRequestAppException } from '../../common/errors/app-exception';

export interface QrPayload {
  matchId: string;
  /** unix seconds */
  windowStart: number;
  /** unix seconds */
  windowEnd: number;
  nonce: string;
}

/**
 * QR động: token đổi mỗi 10 giây, ký HMAC-SHA256 ở backend.
 * Backend chỉ chấp nhận token của time window hiện tại — KHÔNG tin timestamp client (Requirement §10.2).
 */
@Injectable()
export class QrService {
  constructor(private readonly env: EnvService) {}

  private get secret(): string {
    return this.env.qrHmacSecret || 'dev-qr-secret';
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('base64url');
  }

  /** Tạo token cho window hiện tại (10 giây). */
  generateToken(matchId: string, now = Date.now()): { token: string; payload: QrPayload } {
    const windowSeconds = this.env.qrWindowSeconds;
    const windowStart = Math.floor(now / 1000);
    const payload: QrPayload = {
      matchId,
      windowStart,
      windowEnd: windowStart + windowSeconds,
      nonce: randomBytes(8).toString('hex'),
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `${body}.${this.sign(body)}`;
    return { token, payload };
  }

  /** Verify token: chữ ký hợp lệ + window chứa thời điểm hiện tại. */
  verifyToken(token: string, now = Date.now()): QrPayload {
    const [body, sig] = token.split('.');
    if (!body || !sig) {
      throw new BadRequestAppException('QR_TOKEN_EXPIRED', 'Invalid QR token');
    }
    const expected = this.sign(body);
    // So sánh constant-time.
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !this.constantTimeEqual(a, b)) {
      throw new BadRequestAppException('QR_TOKEN_EXPIRED', 'Invalid QR signature');
    }
    let payload: QrPayload;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as QrPayload;
    } catch {
      throw new BadRequestAppException('QR_TOKEN_EXPIRED', 'Malformed QR payload');
    }
    const nowSec = Math.floor(now / 1000);
    if (nowSec < payload.windowStart || nowSec > payload.windowEnd) {
      throw new BadRequestAppException('QR_TOKEN_EXPIRED', 'QR token window expired');
    }
    return payload;
  }

  private constantTimeEqual(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }
}
