import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MatchesService } from './matches.service';
import {
  CheckInDto,
  ConfirmResultDto,
  CreateScheduledMatchDto,
  OpenDisputeDto,
  SubmitResultDto,
} from './dto/match.dto';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/auth.decorator';
import { MobileOnlyGuard } from '../../common/guards/mobile-only.guard';

@ApiTags('matches')
@ApiBearerAuth()
@Controller('matches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo trận được lên lịch (4 người, 2v2)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateScheduledMatchDto) {
    return this.matches.create(user.userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Danh sách trận của user hiện tại' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  myMatches(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.matches.list(user.userId, {
      status,
      page: page != null ? Number(page) : 1,
      limit: limit != null ? Number(limit) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết trận: đội, tỷ số, xác nhận, dispute' })
  detail(@Param('id') id: string) {
    return this.matches.detail(id);
  }

  @Post(':id/roster-confirm')
  @ApiOperation({ summary: 'Xác nhận roster trước trận; khi đủ 4 người → READY và khoá roster' })
  rosterConfirm(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.matches.rosterConfirm(user.userId, id);
  }

  @Post(':id/check-in')
  @UseGuards(MobileOnlyGuard)
  @ApiOperation({ summary: 'Check-in tại sân (bắt buộc mobile, device context)' })
  checkIn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CheckInDto,
  ) {
    return this.matches.checkIn(user.userId, id, dto, user.deviceId ?? 'mobile');
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Creator bắt đầu trận → PLAYING' })
  start(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.matches.start(user.userId, id);
  }

  @Post(':id/result')
  @ApiOperation({ summary: 'Nhập tỷ số (idempotent; sửa tỷ số → reset về Pending Confirmation)' })
  submitResult(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SubmitResultDto) {
    return this.matches.submitResult(user.userId, id, dto);
  }

  @Post(':id/confirm')
  @ApiOperation({
    summary: 'Xác nhận kết quả (AC-06/AC-07)',
    description:
      'Cần ≥3/4 xác nhận và ít nhất 1 đại diện phía đối thủ. Hai confirm đồng thời chỉ tạo 1 RatingTransaction. Chọn DISPUTE nếu muốn mở tranh chấp.',
  })
  confirm(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ConfirmResultDto) {
    if (dto.decision === 'DISPUTE') {
      return this.matches.openDispute(user.userId, id, {
        reason: dto.reason ?? 'Player disputed the result',
        evidenceUrls: [],
      });
    }
    return this.matches.confirmResult(user.userId, id, dto, user.deviceId);
  }

  @Post(':id/dispute')
  @ApiOperation({ summary: 'Mở tranh chấp (AC-08)' })
  openDispute(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: OpenDisputeDto) {
    return this.matches.openDispute(user.userId, id, dto);
  }
}
