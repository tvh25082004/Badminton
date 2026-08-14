import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TXN_STATE_PENDING } from '../../../common/constants/domain';

@Entity('rating_transactions')
export class RatingTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  matchId: string | null;

  @Column({ type: 'varchar', length: 20 })
  type: 'INITIAL' | 'MATCH_RESULT' | 'REVERSAL';  @Column({ type: 'int' })
  ratingBefore: number;

  @Column({ type: 'int' })
  delta: number;

  @Column({ type: 'int' })
  ratingAfter: number;

  @Column({ type: 'varchar', length: 50 })
  algorithmVersion: string;

  @Column({ type: 'enum', enum: ['PENDING', 'APPLIED', 'REVERSED'], default: TXN_STATE_PENDING })
  state: 'PENDING' | 'APPLIED' | 'REVERSED';

  @Column({ type: 'uuid', nullable: true })
  @Index()
  refTransactionId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

