import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/auth.decorator';
import { Role } from '../constants/domain';
import { ForbiddenException, UnauthorizedException } from '../errors/app-exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new UnauthorizedException();

    const allowed =
      user.role === 'ADMIN' ||
      required.includes(user.role) ||
      (required.includes('MODERATOR') && user.role === 'ADMIN');

    if (!allowed) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
