import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { RUBRIC_SCHEMA_VERSION, QuestionId, QUESTIONS } from '../../../domain/assessment/self-assessment';

export class AssessmentAnswerDto {
  @ApiProperty({ enum: QUESTIONS.map((q) => q.id) })
  @IsString()
  questionId: string;

  @ApiProperty({ description: 'Giá trị enum hợp lệ của câu hỏi' })
  @IsString()
  value: string;
}

export class SubmitAssessmentDto {
  @ApiProperty({ example: RUBRIC_SCHEMA_VERSION })
  @IsString()
  schemaVersion: string;

  @ApiProperty({ type: [AssessmentAnswerDto], description: 'Đúng đủ 10 câu, mỗi câu một enum' })
  @IsArray()
  @ArrayUnique((a) => a.questionId)
  @ValidateNested({ each: true })
  @Type(() => AssessmentAnswerDto)
  answers: AssessmentAnswerDto[];
}

export class LeaderboardQueryDto {
  @ApiPropertyOptional({ example: 'Hà Nội / Cầu Giấy' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
