import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { User } from './entities/user.entity';
import { RefreshSession } from './entities/refresh-session.entity';
import { OtpService } from './otp.service';
import { TokenPair } from './dto/token.dto';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { ConflictException, UnauthorizedException } from '../../common/errors/app-exception';
import { USER_STATUS_ACTIVE } from '../../common/constants/domain';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshSession) private readonly refreshRepo: Repository<RefreshSession>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly otpService: OtpService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async requestOtp(phone: string) {
    return this.otpService.issue(phone);
  }

  /** Đăng ký bước 1: kiểm tra SĐT chưa tồn tại rồi gửi OTP. */
  async register(phone: string, name: string, region: string) {
    const existing = await this.userRepo.findOne({ where: { phone } });
    if (existing) {
      throw new ConflictException('PHONE_ALREADY_REGISTERED', 'Số điện thoại này đã đăng ký, vui lòng đăng nhập');
    }
    return this.otpService.issue(phone);
  }

  /** Đăng ký bước 2: verify OTP → tạo User + PlayerProfile (cùng transaction) → cấp token. */
  async registerVerify(phone: string, otp: string, name: string, region: string, deviceId?: string): Promise<TokenPair> {
    await this.otpService.verify(phone, otp);

    const existing = await this.userRepo.findOne({ where: { phone } });
    if (existing) {
      throw new ConflictException('PHONE_ALREADY_REGISTERED', 'Số điện thoại này đã đăng ký, vui lòng đăng nhập');
    }

    const user = await this.dataSource.transaction(async (em) => {
      const u = await em.save(
        em.create(User, { phone, role: 'PLAYER', status: 'ACTIVE', displayName: name }),
      );
      await em.save(em.create(PlayerProfile, { userId: u.id, displayName: name, region }));
      return u;
    });
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const pair = await this.issueTokenPair(user, deviceId, true);
    return pair;
  }

  async verifyOtp(phone: string, otp: string, deviceId?: string): Promise<TokenPair> {
    await this.otpService.verify(phone, otp);

    let user = await this.userRepo.findOne({ where: { phone } });
    let isNewUser = false;
    if (!user) {
      user = await this.userRepo.save(this.userRepo.create({ phone, role: 'PLAYER', status: 'ACTIVE' }));
      isNewUser = true;
    }

    if (user.status !== USER_STATUS_ACTIVE) {
      throw new UnauthorizedException('Account is suspended');
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const pair = await this.issueTokenPair(user, deviceId, isNewUser);
    pair.isNewUser = isNewUser;
    return pair;
  }

  async refresh(refreshToken: string, deviceId?: string): Promise<TokenPair> {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.refreshRepo.findOne({ where: { id: payload.jti } });

    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    // argon2 hash có salt ngẫu nhiên mỗi lần -> KHÔNG so sánh chuỗi hash,
    // phải verify token trực tiếp với hash đã lưu.
    const tokenOk = await argon2.verify(session.tokenHash, refreshToken);
    if (!tokenOk) {
      await this.revokeAllForUser(session.userId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.userRepo.findOne({ where: { id: session.userId } });
    if (!user || user.status !== USER_STATUS_ACTIVE) {
      throw new UnauthorizedException('Account unavailable');
    }

    // rotation: revoke current, issue new pair
    session.revokedAt = new Date();
    await this.refreshRepo.save(session);

    return this.issueTokenPair(user, deviceId ?? session.deviceId ?? undefined);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      await this.refreshRepo.update({ id: payload.jti }, { revokedAt: new Date() });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshRepo.update({ userId }, { revokedAt: new Date() });
  }

  /** Thu hồi toàn bộ session còn sống của user (khi phát hiện reuse). */
  private async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshRepo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async issueTokenPair(user: User, deviceId?: string, isNewUser = false): Promise<TokenPair> {
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET', 'dev_access');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET', 'dev_refresh');
    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL', '900s');
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL', '7d');

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, phone: user.phone, role: user.role, deviceId },
      { secret: accessSecret, expiresIn: accessTtl },
    );

    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti },
      { secret: refreshSecret, expiresIn: refreshTtl },
    );

    const expiresMs = this.parseTtlMs(refreshTtl);
    await this.refreshRepo.save(
      this.refreshRepo.create({
        id: jti,
        userId: user.id,
        tokenHash: await this.hashToken(refreshToken),
        deviceId: deviceId ?? null,
        expiresAt: new Date(Date.now() + expiresMs),
      }),
    );

    return {
      accessToken,
      refreshToken,
      accessExpiresIn: this.parseTtlMs(accessTtl) / 1000,
      isNewUser,
    };
  }

  private async hashToken(token: string): Promise<string> {
    return argon2.hash(token, { type: argon2.argon2id });
  }

  private parseTtlMs(ttl: string): number {
    const unit = ttl.slice(-1);
    const value = Number(ttl.slice(0, -1));
    if (unit === 'd') return value * 86400000;
    if (unit === 'h') return value * 3600000;
    if (unit === 'm') return value * 60000;
    return value * 1000;
  }
}
