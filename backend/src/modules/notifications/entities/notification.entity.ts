import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('notifications')
@Unique(['recipientId', 'dedupeKey'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  recipientId: string;

  @Column({ length: 64 })
  type: string;

  @Column({ length: 160 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ length: 40 })
  resourceType: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  resourceId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deepLink: string | null;

  @Column({ length: 255 })
  dedupeKey: string;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
