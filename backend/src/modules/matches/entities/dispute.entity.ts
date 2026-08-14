import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export const DISPUTE_STATUS_OPEN = 'OPEN';
export const DISPUTE_STATUS_RESOLVED = 'RESOLVED';

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  matchId: string;

  @Column({ type: 'uuid' })
  openedByUserId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'jsonb', default: () => `'[]'::jsonb` })
  evidenceUrls: string[];

  @Column({ type: 'varchar', length: 20, default: DISPUTE_STATUS_OPEN })
  status: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  decision: 'KEEP_RESULT' | 'VOID_MATCH' | null;

  @Column({ type: 'uuid', nullable: true })
  resolvedById: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  moderatorNote: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
