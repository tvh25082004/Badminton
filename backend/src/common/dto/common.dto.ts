import { ApiProperty } from '@nestjs/swagger';

export class ErrorBody {
  @ApiProperty({ example: 'BOOKING_SLOT_UNAVAILABLE' })
  code: string;

  @ApiProperty({ example: 'Court slot is unavailable' })
  message: string;

  @ApiProperty({ example: 'req_abc123' })
  requestId: string;

  @ApiProperty({ required: false })
  details?: unknown;
}

export class ErrorResponse {
  @ApiProperty({ type: ErrorBody })
  error: ErrorBody;
}

export class Paginated<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
