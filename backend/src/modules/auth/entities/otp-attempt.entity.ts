import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('otp_attempts')
@Index(['phone', 'expiresAt'])
export class OtpAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 128 })
  otpHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  expired(ttlSeconds: number): boolean {
    return Date.now() >= this.expiresAt.getTime() || Date.now() - this.createdAt.getTime() >= ttlSeconds * 1000;
  }
}
