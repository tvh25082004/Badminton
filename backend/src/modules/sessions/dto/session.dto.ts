import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ example: 'Cầu lông thứ 3 tối — quận 7' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Venue id (có thể để trống, host tự ghi địa điểm)' })
  @IsOptional()
  @IsString()
  venueId?: string;

  @ApiPropertyOptional({ example: 'Sân Phú Thọ, Q7' })
  @IsOptional()
  @IsString()
  locationText?: string;

  @ApiProperty({ example: '2026-08-20T18:00:00.000Z' })
  @IsDateString()
  startAt: string;

  @ApiProperty({ example: '2026-08-20T20:00:00.000Z' })
  @IsDateString()
  endAt: string;

  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  courtCount: number;

  @ApiProperty({ default: 4 })
  @IsInt()
  @Min(2)
  minParticipants: number;

  @ApiProperty({ default: 8 })
  @IsInt()
  @Min(2)
  @Max(32)
  maxParticipants: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  minRating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  maxRating?: number;

  @ApiProperty({ enum: ['RECREATIONAL', 'PRACTICE', 'RATED'], default: 'RECREATIONAL' })
  @IsEnum(['RECREATIONAL', 'PRACTICE', 'RATED'])
  format: 'RECREATIONAL' | 'PRACTICE' | 'RATED';

  @ApiProperty({ example: 240000, description: 'Tổng chi phí dự kiến (VNĐ)' })
  @IsInt()
  @Min(0)
  totalCost: number;

  @ApiProperty({ enum: ['EQUAL', 'CUSTOM'], default: 'EQUAL' })
  @IsEnum(['EQUAL', 'CUSTOM'])
  costSplitMode: 'EQUAL' | 'CUSTOM';

  @ApiProperty({ example: { 'Thuê sân 2h': 180000, 'Cầu': 60000 } })
  @IsObject()
  costBreakdown: Record<string, number>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genderLimit?: string;
}

export class UpdateSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  courtCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(2)
  maxParticipants?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  totalCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  costBreakdown?: Record<string, number>;

  @ApiPropertyOptional({
    description:
      'Bắt buộc = true nếu cost mới làm tăng chi phí/người so với hiện tại (Requirement §7.3)',
  })
  @IsOptional()
  @IsBoolean()
  acknowledgeCostIncrease?: boolean;
}

export class SetActualCostDto {
  @ApiProperty({ example: { 'Thuê sân 2h': 200000, 'Cầu': 70000 } })
  @IsObject()
  costBreakdown: Record<string, number>;
}
