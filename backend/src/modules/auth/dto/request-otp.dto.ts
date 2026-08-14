import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, MaxLength } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '0901234567', description: 'Số điện thoại Việt Nam' })
  @IsString()
  @Matches(/^0\d{9}$/, { message: 'phone must be a valid Vietnamese number (0xxxxxxxxx)' })
  phone: string;
}

export class RegisterOtpDto {
  @ApiProperty({ example: '0901234567', description: 'Số điện thoại Việt Nam' })
  @IsString()
  @Matches(/^0\d{9}$/, { message: 'phone must be a valid Vietnamese number (0xxxxxxxxx)' })
  phone: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Tên hiển thị khi đăng ký' })
  @IsString()
  @Length(2, 50, { message: 'name must be 2-50 characters' })
  name: string;

  @ApiProperty({ example: 'Quận 7, TP.HCM', description: 'Khu vực thường chơi (bắt buộc theo MVP)' })
  @IsString()
  @Length(2, 120, { message: 'region must be 2-120 characters' })
  region: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '0901234567' })
  @IsString()
  @Matches(/^0\d{9}$/, { message: 'phone must be a valid Vietnamese number (0xxxxxxxxx)' })
  phone: string;

  @ApiProperty({
    example: '333',
    description:
      'Mã OTP 3–6 chữ số. Dev (SMS_MOCK=true): 3 chữ số cố định theo role (ADMIN=111, MODERATOR=222, PLAYER=333). Production (SMS_MOCK=false): 6 chữ số ngẫu nhiên gửi qua SMS.',
  })
  @IsString()
  @Matches(/^\d{3,6}$/, { message: 'otp must be 3-6 digits' })
  otp: string;

  @ApiProperty({
    example: 'device-abc-123',
    description: 'Device ID (mobile). Optional nhưng khuyến nghị gửi để bind session.',
    required: false,
  })
  @IsString()
  deviceId?: string;
}

export class RegisterVerifyDto extends VerifyOtpDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Tên hiển thị (tạo tài khoản mới)' })
  @IsString()
  @Length(2, 50, { message: 'name must be 2-50 characters' })
  name: string;

  @ApiProperty({ example: 'Quận 7, TP.HCM', description: 'Khu vực thường chơi (bắt buộc theo MVP)' })
  @IsString()
  @Length(2, 120, { message: 'region must be 2-120 characters' })
  region: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token (JWT)' })
  @IsString()
  refreshToken: string;
}
