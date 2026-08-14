import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('player_profiles')
export class PlayerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column('uuid')
  userId: string;

  @Column({ length: 80 })
  displayName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'int', nullable: true })
  birthYear: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender: string | null;

  /** Phường/quận hoặc vùng — bắt buộc (MVP). */
  @Column({ length: 120 })
  region: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  handedness: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  preferredPosition: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
