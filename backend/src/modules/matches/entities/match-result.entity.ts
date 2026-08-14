import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

export interface SetScores {
  teamA: number[];
  teamB: number[];
}

@Entity('match_results')
export class MatchResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  matchId: string;

  @Column({ type: 'jsonb' })
  scores: SetScores;

  @Column({ type: 'uuid' })
  submittedById: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: 'PENDING' | 'CONFIRMED';

  @Column({ type: 'jsonb', nullable: true })
  antiFraud: Record<string, unknown> | null;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
