import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PlayersService } from './players.service';
import { CurrentUser } from '../../common/decorators/auth.decorator';
import { AuthenticatedUser } from '../../common/decorators/auth.decorator';

export class UpdatePlayerProfileDto {
  @ApiProperty({ description: 'Tên hiển thị' })
  @IsString()
  displayName: string;

  @ApiProperty({ description: 'Khu vực thường chơi (phường/quận hoặc vùng)' })
  @IsString()
  region: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Tay thuận: right | left' })
  @IsOptional()
  @IsString()
  handedness?: string;

  @ApiPropertyOptional({ description: 'Sở trường: front | back | balanced' })
  @IsOptional()
  @IsString()
  preferredPosition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;
}

@ApiTags('players')
@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get('rubric')
  @ApiOperation({ summary: 'Rubric self-assessment đang active (không expose điểm/band)' })
  rubric() {
    return this.players.rubric();
  }

  @Get('me')
  @ApiOperation({ summary: 'Hồ sơ + rating + lịch sử rating của user hiện tại' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.players.meView(user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật hồ sơ player' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePlayerProfileDto,
  ) {
    const existing = await this.players.profileOf(user.userId);
    if (!existing) {
      await this.players.createProfile(user.userId, dto);
    } else {
      await this.players.updateProfile(user.userId, dto);
    }
    return this.players.meView(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Hồ sơ công khai của một player' })
  publicProfile(@Param('id') id: string) {
    return this.players.publicView(id);
  }
}
