import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '0912345678', description: 'Số điện thoại 10 chữ số, bắt đầu bằng 0' })
  @Matches(/^0\d{9}$/, { message: 'phone must be a 10-digit VN number starting with 0' })
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '0912345678' })
  @Matches(/^0\d{9}$/, { message: 'phone must be a 10-digit VN number starting with 0' })
  phone: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 chữ số' })
  @Matches(/^\d{6}$/, { message: 'otp must be 6 digits' })
  otp: string;

  @ApiProperty({ required: false, example: 'device-abc', description: 'Device ID (mobile). Được ghi nhận để kiểm tra thiết bị ở Quick Match.' })
  deviceId?: string;
}

export class RefreshDto {
  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ required: false })
  deviceId?: string;
}
