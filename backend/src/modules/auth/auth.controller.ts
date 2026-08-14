import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  RequestOtpDto,
  RefreshTokenDto,
  RegisterOtpDto,
  RegisterVerifyDto,
  VerifyOtpDto,
} from './dto/request-otp.dto';
import { CurrentUser, Public } from '../../common/decorators/auth.decorator';
import { AuthenticatedUser } from '../../common/decorators/auth.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('otp/request')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi mã OTP tới số điện thoại (dev: trả mã trong response)' })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.phone);
  }

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng ký bước 1: kiểm tra SĐT + gửi OTP' })
  register(@Body() dto: RegisterOtpDto) {
    return this.authService.register(dto.phone, dto.name, dto.region);
  }

  @Public()
  @Post('register/verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng ký bước 2: xác thực OTP → tạo tài khoản + cấp token' })
  registerVerify(@Body() dto: RegisterVerifyDto) {
    return this.authService.registerVerify(dto.phone, dto.otp, dto.name, dto.region, dto.deviceId);
  }

  @Public()
  @Post('otp/verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực OTP → tạo tài khoản nếu mới, cấp access + refresh token' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.otp, dto.deviceId);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh token rotation (reuse detection)' })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const deviceId = (req.headers['x-device-id'] as string) ?? undefined;
    return this.authService.refresh(dto.refreshToken, deviceId);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Thu hồi refresh session' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Thu hồi toàn bộ session của user' })
  logoutAll(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logoutAll(user.userId);
  }
}
