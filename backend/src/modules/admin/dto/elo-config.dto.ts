import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class KFactorEntryDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  minMatches: number;

  @ApiProperty({ example: 64 })
  @IsNumber()
  @Min(1)
  @Max(200)
  k: number;
}

export class RepeatedOpponentEntryDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  meetings: number;

  @ApiProperty({ example: 1.0 })
  @IsNumber()
  @Min(0.01)
  @Max(1)
  weight: number;
}

export class EloConfigDto {
  @ApiPropertyOptional({ example: 1300 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(3000)
  baseRating?: number;

  @ApiPropertyOptional({ example: 900 })
  @IsOptional()
  @IsInt()
  @Min(100)
  floor?: number;

  @ApiPropertyOptional({ example: 1600 })
  @IsOptional()
  @IsInt()
  @Min(100)
  ceiling?: number;

  @ApiPropertyOptional({
    type: [KFactorEntryDto],
    example: [
      { minMatches: 0, k: 64 },
      { minMatches: 6, k: 48 },
      { minMatches: 11, k: 32 },
      { minMatches: 31, k: 24 },
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => KFactorEntryDto)
  kFactorTable?: KFactorEntryDto[];

  @ApiPropertyOptional({ example: { BEST_OF_3: 1.0, SINGLE_GAME_21: 0.7 } })
  @IsOptional()
  formatWeights?: Record<string, number>;

  @ApiPropertyOptional({
    type: [RepeatedOpponentEntryDto],
    example: [
      { meetings: 1, weight: 1.0 },
      { meetings: 3, weight: 0.75 },
      { meetings: 4, weight: 0.5 },
      { meetings: 5, weight: 0.2 },
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RepeatedOpponentEntryDto)
  repeatedOpponentWeights?: RepeatedOpponentEntryDto[];

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  provisionalMatches?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  leaderboardMinMatches?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  leaderboardMinOpponents?: number;

  @ApiPropertyOptional({ example: 350 })
  @IsOptional()
  @IsInt()
  @Min(0)
  initialDeviation?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  deviationStep?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  deviationFloor?: number;
}
