import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

export const PARTICIPANT_JOINED = 'JOINED';
export const PARTICIPANT_LEFT = 'LEFT';
export const PARTICIPANT_CHECKED_IN = 'CHECKED_IN';

@Entity('session_participants')
@Unique(['sessionId', 'userId'])
export class SessionParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  sessionId: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 20, default: PARTICIPANT_JOINED })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
