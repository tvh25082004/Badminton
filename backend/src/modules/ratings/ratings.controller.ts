import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { LeaderboardQueryDto, SubmitAssessmentDto } from './dto/rating.dto';
import { CurrentUser, Public } from '../../common/decorators/auth.decorator';
import { AuthenticatedUser } from '../../common/decorators/auth.decorator';

@ApiTags('ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Post('self-assessment')
  @ApiOperation({
    summary: 'Đánh giá trình độ ban đầu → provisional doubles rating [900,1600]',
    description:
      'Backend tính điểm + band + rating. Client chỉ gửi question_id/value. Mỗi user chỉ 1 lần.',
  })
  submitAssessment(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitAssessmentDto) {
    return this.ratings.submitAssessment(user.userId, dto.schemaVersion, dto.answers);
  }

  @Get('me')
  @ApiOperation({ summary: 'Rating hiện tại + confidence' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.ratings.getMyRating(user.userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Lịch sử rating transaction (AC-14)' })
  history(@CurrentUser() user: AuthenticatedUser, @Query() query: LeaderboardQueryDto) {
    return this.ratings.history(user.userId, query.page ?? 1, query.limit ?? 20);
  }

  @Public()
  @Get('leaderboard')
  @ApiOperation({
    summary: 'Bảng xếp hạng chính (AC-17)',
    description: 'Chỉ bao gồm player đủ 10 trận rated, 6 đối thủ khác nhau, không UNDER_REVIEW.',
  })
  @ApiQuery({ name: 'region', required: false })
  leaderboard(@Query() query: LeaderboardQueryDto) {
    return this.ratings.leaderboard({
      region: query.region,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Public()
  @Get('history/:userId')
  @ApiOperation({ summary: 'Lịch sử rating của một player (public)' })
  publicHistory(@Param('userId') userId: string, @Query() query: LeaderboardQueryDto) {
    return this.ratings.history(userId, query.page ?? 1, query.limit ?? 20);
  }
}
