import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuickMatchesService } from './quick-matches.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/auth.decorator';
import { MobileOnlyGuard } from '../../common/guards/mobile-only.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

class CreateQuickMatchDto {
  @ApiProperty({ enum: ['BEST_OF_3', 'SINGLE_GAME_21'] })
  @IsIn(['BEST_OF_3', 'SINGLE_GAME_21'])
  format: 'BEST_OF_3' | 'SINGLE_GAME_21';
}

class JoinQuickMatchDto {
  @ApiProperty({ description: 'QR token 10 giây từ app của creator' })
  @IsString()
  token: string;

  @ApiProperty({ enum: ['A', 'B'] })
  @IsIn(['A', 'B'])
  team: 'A' | 'B';
}

@ApiTags('quick-matches')
@ApiBearerAuth()
@UseGuards(RolesGuard, MobileOnlyGuard)
@Controller('quick-matches')
export class QuickMatchesController {
  constructor(private readonly quick: QuickMatchesService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo Quick Rated Match (bắt buộc mobile)', description: 'AC-04/AC-05: creator mobile, QR động 10s, invite 5 phút.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateQuickMatchDto) {
    return this.quick.create(user.userId, user.deviceId ?? 'mobile-device', dto.format);
  }

  @Get(':id/qr-token')
  @ApiOperation({ summary: 'Lấy QR token hiện tại (đổi mỗi 10 giây)' })
  getQrToken(@Param('id') id: string) {
    return this.quick.currentQrToken(id).then((qrToken) => ({ qrToken, ttlSeconds: 10 }));
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Tham gia bằng QR động (tự join, không phải invite)' })
  join(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: JoinQuickMatchDto,
  ) {
    return this.quick.join(user.userId, user.deviceId ?? 'mobile-device', id, dto.token, dto.team);
  }

  @Post(':id/setup-confirm')
  @ApiOperation({ summary: 'Xác nhận setup trận (bắt buộc mobile), đủ 4 → READY' })
  setupConfirm(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.quick.setupConfirm(user.userId, id, user.deviceId ?? 'mobile-device');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Trạng thái quick match + roster' })
  getDetail(@Param('id') id: string) {
    return this.quick.getDetail(id);
  }
}
