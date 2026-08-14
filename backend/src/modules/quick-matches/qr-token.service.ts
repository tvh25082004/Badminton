import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export interface QrTokenPayload {
  matchId: string;
  window: number;
}

export const QR_WINDOW_MS = 10_000;

@Injectable()
export class QrTokenService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.get<string>('QR_HMAC_SECRET', 'dev_qr_secret');
  }

  currentWindow(now: number = Date.now()): number {
    return Math.floor(now / QR_WINDOW_MS);
  }

  sign(payload: QrTokenPayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', this.secret).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  /**
   * AC-05: token chỉ hợp lệ trong time window hiện tại (10s).
   * Backend ký/xác thực, không tin timestamp từ client.
   */
  verify(token: string, now: number = Date.now()): QrTokenPayload {
    const [body, sig] = token.split('.');
    if (!body || !sig) {
      throw new Error('INVALID_TOKEN');
    }
    const expected = createHmac('sha256', this.secret).update(body).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error('INVALID_TOKEN');
    }

    let payload: QrTokenPayload;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as QrTokenPayload;
    } catch {
      throw new Error('INVALID_TOKEN');
    }

    const currentWindow = this.currentWindow(now);
    if (payload.window !== currentWindow) {
      throw new Error('TOKEN_EXPIRED');
    }
    return payload;
  }
}
