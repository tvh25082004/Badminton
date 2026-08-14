import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { SESSION_STATUS_DRAFT, SESSION_STATUS_OPEN } from '../../../common/constants/domain';

export type SessionFormat = 'RECREATIONAL' | 'PRACTICE' | 'RATED';
export type CostSplitMode = 'EQUAL' | 'CUSTOM';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  hostId: string;

  @Column({ type: 'uuid', nullable: true })
  venueId: string | null;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'timestamptz' })
  startAt: Date;

  @Column({ type: 'timestamptz' })
  endAt: Date;

  @Column({ type: 'int', default: 1 })
  courtCount: number;

  @Column({ type: 'int' })
  maxParticipants: number;

  @Column({ type: 'int', default: 2 })
  minParticipants: number;

  @Column({ type: 'int', nullable: true })
  minRating: number | null;

  @Column({ type: 'int', nullable: true })
  maxRating: number | null;

  @Column({ type: 'varchar', length: 20, default: 'RECREATIONAL' })
  format: SessionFormat;

  @Column({ type: 'bigint', default: 0 })
  totalCost: number;

  @Column({ type: 'varchar', length: 20, default: 'EQUAL' })
  costSplitMode: CostSplitMode;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  costBreakdown: Record<string, number>;

  @Column({ type: 'varchar', length: 30, default: SESSION_STATUS_DRAFT })
  @Index()
  status: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  genderLimit: string | null;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  get currentStatus(): string {
    return this.status;
  }
}
