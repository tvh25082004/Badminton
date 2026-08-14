import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class MatchPlayerInputDto {
  @ApiProperty({ description: 'user id' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'A', enum: ['A', 'B'] })
  @IsIn(['A', 'B'])
  team: 'A' | 'B';
}

export class CreateScheduledMatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  venueId?: string;

  @ApiPropertyOptional({ example: '2026-08-20T14:30:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ enum: ['RATED', 'UNRATED'], default: 'RATED' })
  @IsOptional()
  @IsIn(['RATED', 'UNRATED'])
  mode?: 'RATED' | 'UNRATED';

  @ApiProperty({ enum: ['BEST_OF_3', 'SINGLE_GAME_21', 'CUSTOM'] })
  @IsEnum(['BEST_OF_3', 'SINGLE_GAME_21', 'CUSTOM'])
  format: 'BEST_OF_3' | 'SINGLE_GAME_21' | 'CUSTOM';

  @ApiProperty({ type: [MatchPlayerInputDto], description: 'Đúng 4 người, đội A/B, mỗi đội 2 người' })
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => MatchPlayerInputDto)
  players: MatchPlayerInputDto[];
}

export class SubmitResultDto {
  @ApiProperty({
    example: { teamA: [21, 18, 15], teamB: [18, 21, 12] },
    description: 'Điểm số từng set. BEST_OF_3: tối đa 3 set. SINGLE_GAME_21: 1 set.',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  scores: { teamA: number[]; teamB: number[] };
}

export class ConfirmResultDto {
  @ApiProperty({ enum: ['CONFIRM', 'DISPUTE'] })
  @IsIn(['CONFIRM', 'DISPUTE'])
  decision: 'CONFIRM' | 'DISPUTE';

  @ApiPropertyOptional({ description: 'Bắt buộc nếu decision = DISPUTE' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string;

  @ApiPropertyOptional({ description: 'Id của kết quả đang pending cần confirm (mặc định: mới nhất)' })
  @IsOptional()
  @IsUUID()
  resultId?: string;
}

export class CheckInDto {
  @ApiPropertyOptional({ example: 10.762622 })
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 106.660172 })
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  accuracyMeters?: number;
}

export class OpenDisputeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ type: [String], description: 'Ảnh bằng chứng (url)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];
}
