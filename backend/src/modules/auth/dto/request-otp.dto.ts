import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '0901234567', description: 'Số điện thoại Việt Nam' })
  @IsString()
  @Matches(/^0\d{9}$/, { message: 'phone must be a valid Vietnamese number (0xxxxxxxxx)' })
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '0901234567' })
  @IsString()
  @Matches(/^0\d{9}$/, { message: 'phone must be a valid Vietnamese number (0xxxxxxxxx)' })
  phone: string;

  @ApiProperty({ example: '333', description: 'Mã OTP 3 chữ số (dev: ADMIN=111, MODERATOR=222, PLAYER=333)' })
  @IsString()
  @Matches(/^\d{3}$/, { message: 'otp must be exactly 3 digits' })
  otp: string;

  @ApiProperty({
    example: 'device-abc-123',
    description: 'Device ID (mobile). Optional nhưng khuyến nghị gửi để bind session.',
    required: false,
  })
  @IsString()
  deviceId?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token (JWT)' })
  @IsString()
  refreshToken: string;
}
