import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { randomInt } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { OtpAttempt } from './entities/otp-attempt.entity';
import { User } from './entities/user.entity';
import { BadRequestAppException } from '../../common/errors/app-exception';

/**
 * DEV ONLY (SMS_MOCK=true): OTP cố định 3 số theo role để test nhanh.
 * - ADMIN = 111
 * - MODERATOR = 222
 * - PLAYER = 333 (mặc định cho SĐT chưa tồn tại)
 */
export const DEV_OTP_BY_ROLE: Record<string, string> = {
  ADMIN: '111',
  MODERATOR: '222',
  PLAYER: '333',
};

export interface IssuedOtp {
  expiresInSeconds: number;
  /** DEV ONLY: chỉ tồn tại khi SMS_MOCK=true */
  devOtp?: string;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(OtpAttempt) private readonly otpRepo: Repository<OtpAttempt>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async issue(phone: string): Promise<IssuedOtp> {
    const ttl = this.config.get<number>('OTP_TTL_SECONDS', 300);
    const resendWindow = this.config.get<number>('OTP_RESEND_SECONDS', 60);

    const last = await this.otpRepo
      .createQueryBuilder('o')
      .where('o.phone = :phone', { phone })
      .andWhere('o.verifiedAt IS NULL')
      .orderBy('o.createdAt', 'DESC')
      .getOne();

    if (last && !last.expired(ttl) && last.attempts < this.config.get<number>('OTP_MAX_ATTEMPTS', 5)) {
      const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
      if (elapsed < resendWindow) {
        throw new BadRequestAppException(
          'OTP_RESEND_TOO_SOON',
          `Please wait ${Math.ceil(resendWindow - elapsed)}s before requesting a new OTP`,
        );
      }
    }

    const mock = this.config.get<string>('SMS_MOCK', 'true') === 'true';
    const otp = mock ? await this.devOtpFor(phone) : this.generateRandom();
    const otpHash = await argon2.hash(otp, { type: argon2.argon2id });

    await this.otpRepo.save(
      this.otpRepo.create({
        phone,
        otpHash,
        expiresAt: new Date(Date.now() + ttl * 1000),
        attempts: 0,
      }),
    );

    if (mock) {
      this.logger.log(`[DEV SMS] OTP for ${phone} = ${otp}`);
    }
    // Thay bằng SMS provider integration tại đây khi có.
    return { expiresInSeconds: ttl, ...(mock ? { devOtp: otp } : {}) };
  }

  /** DEV: OTP cố định theo role của SĐT; SĐT chưa đăng ký → PLAYER. */
  private async devOtpFor(phone: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { phone } });
    const role = user?.role ?? 'PLAYER';
    return DEV_OTP_BY_ROLE[role] ?? DEV_OTP_BY_ROLE.PLAYER;
  }

  private generateRandom(): string {
    return randomInt(100000, 999999).toString();
  }


  async verify(phone: string, otp: string): Promise<void> {
    const ttl = this.config.get<number>('OTP_TTL_SECONDS', 300);
    const maxAttempts = this.config.get<number>('OTP_MAX_ATTEMPTS', 5);

    const attempt = await this.otpRepo
      .createQueryBuilder('o')
      .where('o.phone = :phone', { phone })
      .andWhere('o.verifiedAt IS NULL')
      .orderBy('o.createdAt', 'DESC')
      .getOne();

    if (!attempt) {
      throw new BadRequestAppException('INVALID_OTP', 'Invalid OTP');
    }
    if (attempt.expired(ttl)) {
      throw new BadRequestAppException('OTP_EXPIRED', 'OTP has expired');
    }
    if (attempt.attempts >= maxAttempts) {
      throw new BadRequestAppException('OTP_TOO_MANY_ATTEMPTS', 'Too many invalid attempts, request a new OTP');
    }

    const ok = await argon2.verify(attempt.otpHash, otp);
    if (!ok) {
      attempt.attempts += 1;
      await this.otpRepo.save(attempt);
      throw new BadRequestAppException('INVALID_OTP', 'Invalid OTP');
    }

    attempt.verifiedAt = new Date();
    await this.otpRepo.save(attempt);
  }
}
