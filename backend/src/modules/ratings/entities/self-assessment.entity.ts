import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Band } from '../../../domain/assessment/self-assessment';

@Entity('self_assessments')
export class SelfAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ length: 20 })
  schemaVersion: string;

  @Column({ type: 'jsonb' })
  answers: Array<{ questionId: string; value: string }>;

  @Column({ type: 'int' })
  totalScore: number;

  @Column({ type: 'varchar', length: 30 })
  band: Band;

  @Column({ type: 'int' })
  rating: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
