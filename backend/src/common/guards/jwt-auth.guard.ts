import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorator';
import { UnauthorizedException } from '../errors/app-exception';
import { UserService } from '../../modules/users/users.service';
import { USER_STATUS_ACTIVE } from '../constants/domain';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly users: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const header: string = request.headers?.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }

    let payload: { sub: string; phone?: string; role?: string; deviceId?: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    // ACL-20: mọi authenticated request đọc trạng thái User từ DB và từ chối user không ACTIVE.
    const user = await this.users.findByIdInternal(payload.sub);
    if (!user) throw new UnauthorizedException('Account not found');
    if (user.status !== USER_STATUS_ACTIVE) {
      throw new UnauthorizedException('Account is suspended');
    }

    request.user = {
      userId: user.id,
      phone: user.phone,
      role: user.role,
      deviceId: payload.deviceId,
    };
    return true;
  }
}
