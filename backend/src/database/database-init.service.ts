import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

// Cột TypeORM tạo dạng quoted camelCase ("matchId", "userId", ...) nên SQL phải quote đúng.
const DDL: string[] = [
  // AC-7: partial unique index chống 2 confirm đồng thời tạo 2 RatingTransaction cho cùng match+user.
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_rating_txn_match_user
   ON rating_transactions ("matchId", "userId")
   WHERE type = 'MATCH_RESULT'`,
  // AC-9 / AC-22: reversal phải unique theo match để void không reverse 2 lần.
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_rating_txn_reversal_match
   ON rating_transactions ("matchId", "refTransactionId")
   WHERE type = 'REVERSAL'`,
  `CREATE INDEX IF NOT EXISTS idx_rating_txn_user_created
   ON rating_transactions ("userId", "createdAt" DESC)`,
];

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      for (const sql of DDL) {
        await this.dataSource.query(sql);
      }
      this.logger.log('Database indexes ensured');
    } catch (err) {
      this.logger.error('Failed to ensure indexes', err instanceof Error ? err.stack : undefined);
    }
  }
}
