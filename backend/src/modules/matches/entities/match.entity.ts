import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { MATCH_MODE_RATED, MATCH_STATUS_DRAFT } from '../../../common/constants/domain';

export type MatchMode = 'RATED' | 'UNRATED';
export type MatchType = 'SCHEDULED' | 'QUICK';
export type MatchFormat = 'BEST_OF_3' | 'SINGLE_GAME_21' | 'CUSTOM';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  sessionId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'SCHEDULED' })
  matchType: MatchType;

  @Column({ type: 'varchar', length: 20, default: MATCH_MODE_RATED })
  @Index()
  mode: MatchMode;

  @Column({ type: 'varchar', length: 30, default: 'BEST_OF_3' })
  format: MatchFormat;

  @Column({ type: 'varchar', length: 30, default: MATCH_STATUS_DRAFT })
  @Index()
  status: string;

  @Column({ type: 'uuid', nullable: true })
  creatorId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  venueId: string | null;

  @Column({ type: 'varchar', length: 250, nullable: true })
  locationText: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  quickInviteExpiresAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  ratedAt: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  antiFraudDecision: 'PASS' | 'REVIEW' | null;

  @Column({ type: 'jsonb', nullable: true })
  antiFraudSignals: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true })
  voidedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  voidedById: string | null;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
