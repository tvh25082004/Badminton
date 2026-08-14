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

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 chữ số' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'otp must be exactly 6 digits' })
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
