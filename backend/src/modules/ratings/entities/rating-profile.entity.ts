import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { RATING_STATE_PROVISIONAL, RATING_TYPE_DOUBLES, RatingState, RatingType } from '../../../common/constants/domain';

@Entity('rating_profiles')
export class RatingProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index({ unique: true })
  userId: string;

  @Column({ type: 'varchar', length: 20, default: RATING_TYPE_DOUBLES })
  type: RatingType;

  @Column({ type: 'int', default: 1300 })
  rating: number;

  @Column({ type: 'enum', enum: ['PROVISIONAL', 'ESTABLISHED', 'UNDER_REVIEW'], default: RATING_STATE_PROVISIONAL })
  ratingState: RatingState;

  @Column({ type: 'int', default: 0 })
  ratedMatches: number;

  @Column({ type: 'int', default: 0 })
  uniqueOpponents: number;

  @Column({ type: 'int', default: 350 })
  ratingDeviation: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastRankedAt: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'elo.doubles.v1' })
  algorithmVersion: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
