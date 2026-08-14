import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditInput {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  requestId?: string | null;
  ip?: string | null;
  idempotencyKey?: string | null;
}

/**
 * Audit log — append-only, không có API sửa/xoá (Requirement §14.1).
 * Không sao chép phone/vị trí/evidence nhạy cảm vào log.
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>,
  ) {}

  async log(input: AuditInput): Promise<AuditLog> {
    return this.logs.save(
      this.logs.create({
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        before: input.before ?? null,
        after: input.after ?? null,
        reason: input.reason ?? null,
        requestId: input.requestId ?? null,
        ip: input.ip ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
      }),
    );
  }

  async list(opts: { page: number; limit: number; action?: string; actorId?: string }) {
    const qb = this.logs.createQueryBuilder('a');
    if (opts.action) qb.andWhere('a.action = :action', { action: opts.action });
    if (opts.actorId) qb.andWhere('a.actorId = :actorId', { actorId: opts.actorId });
    qb.orderBy('a.createdAt', 'DESC')
      .skip((opts.page - 1) * opts.limit)
      .take(opts.limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: opts.page, limit: opts.limit };
  }
}
