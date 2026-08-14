import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MOBILE_ONLY_KEY } from '../decorators/auth.decorator';
import { BadRequestAppException } from '../errors/app-exception';

@Injectable()
export class MobileOnlyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const mobileOnly = this.reflector.getAllAndOverride<boolean>(MOBILE_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!mobileOnly) return true;

    const request = context.switchToHttp().getRequest();
    const deviceId =
      request.user?.deviceId ??
      (request.headers['x-device-id'] as string | undefined);

    if (!deviceId || deviceId.trim().length === 0) {
      throw new BadRequestAppException(
        'INVALID_DEVICE',
        'This operation requires the mobile app with a registered device',
      );
    }
    return true;
  }
}
