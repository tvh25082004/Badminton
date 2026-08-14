import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Ghi nhận từng player đã confirm một MatchResult.
 * Unique (resultId, userId) → 2 confirm đồng thời không tạo 2 lần ghi (AC-7).
 */
@Entity('match_result_confirmations')
@Unique(['matchResultId', 'userId'])
export class ResultConfirmation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  matchResultId: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'timestamptz' })
  confirmedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
