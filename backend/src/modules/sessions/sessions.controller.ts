import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, SetActualCostDto, UpdateSessionDto } from './dto/session.dto';
import { CurrentUser, AuthenticatedUser, Public } from '../../common/decorators/auth.decorator';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Tìm phiên chơi theo khu vực/thời gian/rating (AC-02)' })
  search(
    @Query('q') q?: string,
    @Query('region') region?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
    @Query('format') format?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sessions.search({
      q,
      region,
      from,
      to,
      minRating: minRating != null ? Number(minRating) : undefined,
      maxRating: maxRating != null ? Number(maxRating) : undefined,
      format,
      page: page != null ? Number(page) : 1,
      limit: limit != null ? Number(limit) : 20,
    });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết phiên (kèm chi phí dự kiến/người)' })
  detail(@Param('id') id: string) {
    return this.sessions.detail(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo phiên chơi (user trở thành Host)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSessionDto) {
    return this.sessions.create(user.userId, dto);
  }

  @Get('me/joined')
  @ApiOperation({ summary: 'Danh sách session đang tham gia' })
  mySessions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sessions.mySessions(
      user.userId,
      page != null ? Number(page) : 1,
      limit != null ? Number(limit) : 20,
    );
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Tham gia phiên (AC-03, rate-limited)' })
  join(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.sessions.join(user.userId, id);
  }

  @Delete(':id/join')
  @ApiOperation({ summary: 'Rời phiên — mở lại slot nếu đang full, gửi notification' })
  leave(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.sessions.leave(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Host cập nhật phiên (chi phí bị lock sau khi bắt đầu)' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessions.update(user.userId, id, dto);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Host bắt đầu phiên (OPEN/FULL → IN_PROGRESS)' })
  start(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.sessions.transition(user.userId, id, 'IN_PROGRESS');
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Host hoàn tất phiên (kèm chi phí thực tế)' })
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto?: SetActualCostDto,
  ) {
    return this.sessions.transition(
      user.userId,
      id,
      'COMPLETED',
      dto?.costBreakdown,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Host huỷ phiên (DRAFT/OPEN/FULL → CANCELLED)' })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.sessions.transition(user.userId, id, 'CANCELLED');
  }
}
