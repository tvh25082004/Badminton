import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class SuspendUserDto {
  @ApiProperty({ example: 'Vi phạm quy định nhiều lần' })
  @IsString()
  @MinLength(3)
  reason: string;

  @ApiPropertyOptional({ description: 'Idempotency key chống suspend/unsuspend trùng' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ enum: ['KEEP_RESULT', 'VOID_MATCH'] })
  @IsIn(['KEEP_RESULT', 'VOID_MATCH'])
  decision: 'KEEP_RESULT' | 'VOID_MATCH';

  @ApiPropertyOptional({ example: 'Bằng chứng ảnh xác nhận tỷ số' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class VoidMatchDto {
  @ApiProperty({ example: 'Nhập nhầm tỷ số, hai bên thống nhất huỷ' })
  @IsString()
  @MinLength(3)
  reason: string;

  @ApiPropertyOptional({ description: 'Idempotency key chống void trùng' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class UpdateEloConfigDto {
  @ApiProperty({ example: 'k_factor' })
  @IsString()
  key: string;

  @ApiProperty({ example: { '0-5': 64, '6-10': 48, '11-30': 32, '31+': 24 } })
  @IsObject()
  value: unknown;
}
