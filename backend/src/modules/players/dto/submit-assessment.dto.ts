import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AssessmentAnswerDto {
  @ApiProperty({ example: 'experience_years' })
  @IsString()
  questionId: string;

  @ApiProperty({ example: 'Y1_TO_3Y' })
  @IsString()
  value: string;
}

export class SubmitAssessmentDto {
  @ApiProperty({ example: '2026.08.2' })
  @IsString()
  schemaVersion: string;

  @ApiProperty({ type: [AssessmentAnswerDto] })
  @IsArray()
  @ArrayMinSize(10)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AssessmentAnswerDto)
  answers: AssessmentAnswerDto[];
}
