import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Role, UserStatus } from '../../../common/constants/domain';
import { RefreshSession } from './refresh-session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  phone: string;

  @Column({ type: 'enum', enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' })
  status: UserStatus;

  @Column({ type: 'enum', enum: ['PLAYER', 'MODERATOR', 'ADMIN'], default: 'PLAYER' })
  role: Role;

  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => RefreshSession, (rs) => rs.user)
  refreshSessions: RefreshSession[];
}
