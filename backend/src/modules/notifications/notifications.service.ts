import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotFoundException } from '../../common/errors/app-exception';

export interface NotifyInput {
  recipientId: string;
  type: string;
  title: string;
  body?: string | null;
  resourceType: string;
  resourceId?: string | null;
  deepLink?: string | null;
  dedupeKey: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  /**
   * Persist notification — dedupe_key unique per recipient (AC-18):
   * retry cùng event không tạo inbox item trùng (bắt unique violation → bỏ qua).
   */
  async create(input: NotifyInput): Promise<Notification | null> {
    try {
      return await this.notifications.save(
        this.notifications.create({
          recipientId: input.recipientId,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          resourceType: input.resourceType,
          resourceId: input.resourceId ?? null,
          deepLink: input.deepLink ?? null,
          dedupeKey: input.dedupeKey,
        }),
      );
    } catch (e) {
      // Duplicate (recipientId, dedupeKey) — idempotent, bỏ qua.
      if ((e as { code?: string }).code === '23505') return null;
      throw e;
    }
  }

  async list(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const where: Record<string, unknown> = { recipientId: userId };
    if (unreadOnly) where.readAt = IsNull();
    const [items, total] = await this.notifications.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.notifications.findOne({
      where: { id: notificationId, recipientId: userId },
    });
    if (!notification) {
      throw new NotFoundException('NOTIFICATION_NOT_FOUND', 'Notification not found');
    }
    notification.readAt = notification.readAt ?? new Date();
    return this.notifications.save(notification);
  }

  async markAllRead(userId: string) {
    await this.notifications
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('recipientId = :userId', { userId })
      .andWhere('readAt IS NULL')
      .execute();
    return { ok: true };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.notifications.count({ where: { recipientId: userId, readAt: IsNull() } });
  }
}
