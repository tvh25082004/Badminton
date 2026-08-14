import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Centralized, validated environment configuration.
 * Secrets never leave this service and are never logged.
 */
@Injectable()
export class EnvService {
  constructor(private readonly config: ConfigService) {}

  get port(): number {
    return Number(this.config.get<string>('PORT', '4000'));
  }

  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV', 'development');
  }

  get appName(): string {
    return this.config.get<string>('APP_NAME', 'badminton-api');
  }

  get corsOrigins(): string[] {
    return (this.config.get<string>('CORS_ORIGINS', 'http://localhost:3000') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  get dbHost(): string {
    return this.config.get<string>('DB_HOST', 'localhost');
  }
  get dbPort(): number {
    return Number(this.config.get<string>('DB_PORT', '5432'));
  }
  get dbUser(): string {
    return this.config.get<string>('DB_USER', 'badminton');
  }
  get dbPassword(): string {
    return this.config.get<string>('DB_PASSWORD', 'badminton_dev');
  }
  get dbName(): string {
    return this.config.get<string>('DB_NAME', 'badminton');
  }

  get jwtAccessSecret(): string {
    return this.config.get<string>('JWT_ACCESS_SECRET', '');
  }
  get jwtRefreshSecret(): string {
    return this.config.get<string>('JWT_REFRESH_SECRET', '');
  }
  get jwtAccessTtl(): string {
    return this.config.get<string>('JWT_ACCESS_TTL', '15m');
  }
  get jwtRefreshTtl(): string {
    return this.config.get<string>('JWT_REFRESH_TTL', '7d');
  }

  get smsMock(): boolean {
    return this.config.get<string>('SMS_MOCK', 'true') === 'true';
  }
  get otpTtlSeconds(): number {
    return Number(this.config.get<string>('OTP_TTL_SECONDS', '300'));
  }
  get otpMaxAttempts(): number {
    return Number(this.config.get<string>('OTP_MAX_ATTEMPTS', '5'));
  }
  get otpRequestCooldownSeconds(): number {
    return Number(this.config.get<string>('OTP_REQUEST_COOLDOWN_SECONDS', '60'));
  }

  get qrWindowSeconds(): number {
    return Number(this.config.get<string>('QR_WINDOW_SECONDS', '10'));
  }
  get qrInviteTtlSeconds(): number {
    return Number(this.config.get<string>('QR_INVITE_TTL_SECONDS', '300'));
  }
  get qrHmacSecret(): string {
    return this.config.get<string>('QR_HMAC_SECRET', '');
  }

  get throttleTtlMs(): number {
    return Number(this.config.get<string>('THROTTLE_TTL_MS', '60000'));
  }
  get throttleLimit(): number {
    return Number(this.config.get<string>('THROTTLE_LIMIT', '120'));
  }
}
