import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class UpsertProfileDto {
  @ApiProperty({ example: 'Bình Minh' })
  @IsNotEmpty()
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 1995 })
  @IsOptional()
  @IsInt()
  @Min(1940)
  @Max(2026)
  birthYear?: number;

  @ApiPropertyOptional({ example: 'MALE', enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] })
  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
  gender?: string;

  @ApiProperty({ example: 'Hà Nội / Cầu Giấy' })
  @IsNotEmpty()
  @IsString()
  region: string;

  @ApiPropertyOptional({ example: 'RIGHT', enum: ['LEFT', 'RIGHT', 'AMBIDEXTROUS'] })
  @IsOptional()
  @IsIn(['LEFT', 'RIGHT', 'AMBIDEXTROUS'])
  dominantHand?: string;

  @ApiPropertyOptional({ example: 'BACK', enum: ['FRONT', 'BACK', 'BALANCED'] })
  @IsOptional()
  @IsIn(['FRONT', 'BACK', 'BALANCED'])
  preferredPosition?: string;
}
