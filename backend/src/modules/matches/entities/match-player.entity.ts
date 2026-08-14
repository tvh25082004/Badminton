import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('match_players')
@Unique(['matchId', 'userId'])
export class MatchPlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  matchId: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 1 })
  team: 'A' | 'B';

  @Column({ type: 'boolean', default: false })
  rosterConfirmed: boolean;

  @Column({ type: 'varchar', length: 128, nullable: true })
  deviceId: string | null;

  @Column({ type: 'bigint', nullable: true })
  qrWindow: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  joinedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
