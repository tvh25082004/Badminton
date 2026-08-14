import { ApiProperty } from '@nestjs/swagger';

export class TokenPair {
  @ApiProperty({ description: 'Access token (15m)' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token (7d, rotation)' })
  refreshToken: string;

  @ApiProperty()
  accessExpiresIn: number;

  @ApiProperty({ description: 'true nếu tài khoản vừa được tạo mới' })
  isNewUser: boolean;
}
