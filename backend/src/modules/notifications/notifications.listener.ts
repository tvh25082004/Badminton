import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { MatchPlayer } from '../matches/entities/match-player.entity';
import { DomainEventEnvelope, Events } from '../../common/events/domain-event';
import { NotificationsService } from './notifications.service';

interface SessionEventData {
  sessionId: string;
  actorUserId: string;
  version?: number;
  changedFields?: string[];
}

interface MatchEventData {
  matchId: string;
  resultId?: string;
  disputeId?: string;
  actorUserId?: string;
  perUser?: Record<string, { oldRating: number; newRating: number; delta: number }>;
}

/**
 * In-process event → notification inbox.
 * Notification persist cùng transaction tạo ra nó (event emit ngay trong transaction);
 * dedupe_key đảm bảo retry/duplicate không tạo item trùng (Requirement §13.1).
 */
@Injectable()
export class NotificationsListener {
  constructor(
    private readonly notifications: NotificationsService,
    @InjectRepository(SessionParticipant)
    private readonly participants: Repository<SessionParticipant>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayers: Repository<MatchPlayer>,
  ) {}

  private async sessionRecipients(sessionId: string, exceptUserId: string): Promise<string[]> {
    const list = await this.participants.find({
      where: { sessionId, status: 'JOINED' },
    });
    return list.map((p) => p.userId).filter((id) => id !== exceptUserId);
  }

  private async matchRecipients(matchId: string, exceptUserId?: string): Promise<string[]> {
    const list = await this.matchPlayers.find({ where: { matchId } });
    return list
      .map((p) => p.userId)
      .filter((id) => (exceptUserId ? id !== exceptUserId : true));
  }

  @OnEvent(Events.SessionJoined)
  async onSessionJoined(event: DomainEventEnvelope<SessionEventData>) {
    const recipients = await this.sessionRecipients(event.data.sessionId, event.data.actorUserId);
    for (const recipientId of recipients) {
      await this.notifications.create({
        recipientId,
        type: 'SESSION_PARTICIPANT_JOINED',
        title: 'Có người tham gia phiên',
        body: 'Một người chơi vừa tham gia phiên của bạn.',
        resourceType: 'session',
        resourceId: event.data.sessionId,
        deepLink: `badminton://sessions/${event.data.sessionId}`,
        dedupeKey: `session:${event.data.sessionId}:participant:${event.data.actorUserId}:joined`,
      });
    }
  }

  @OnEvent(Events.SessionLeft)
  async onSessionLeft(event: DomainEventEnvelope<SessionEventData>) {
    const recipients = await this.sessionRecipients(event.data.sessionId, event.data.actorUserId);
    for (const recipientId of recipients) {
      await this.notifications.create({
        recipientId,
        type: 'SESSION_PARTICIPANT_LEFT',
        title: 'Có người rời phiên',
        body: 'Một người chơi đã rời phiên, slot được mở lại.',
        resourceType: 'session',
        resourceId: event.data.sessionId,
        deepLink: `badminton://sessions/${event.data.sessionId}`,
        dedupeKey: `session:${event.data.sessionId}:participant:${event.data.actorUserId}:left`,
      });
    }
  }

  @OnEvent(Events.SessionUpdated)
  async onSessionUpdated(event: DomainEventEnvelope<SessionEventData>) {
    const recipients = await this.sessionRecipients(event.data.sessionId, event.data.actorUserId);
    for (const recipientId of recipients) {
      await this.notifications.create({
        recipientId,
        type: 'SESSION_UPDATED',
        title: 'Phiên chơi vừa được cập nhật',
        body: `Host đã thay đổi: ${(event.data.changedFields ?? []).join(', ')}`,
        resourceType: 'session',
        resourceId: event.data.sessionId,
        deepLink: `badminton://sessions/${event.data.sessionId}`,
        dedupeKey: `session:${event.data.sessionId}:updated:${event.data.version}`,
      });
    }
  }

  @OnEvent(Events.MatchResultConfirmRequired)
  async onConfirmRequired(event: DomainEventEnvelope<MatchEventData>) {
    const recipients = await this.matchRecipients(event.data.matchId, event.data.actorUserId);
    for (const recipientId of recipients) {
      await this.notifications.create({
        recipientId,
        type: 'MATCH_RESULT_CONFIRM_REQUIRED',
        title: 'Cần xác nhận tỷ số',
        body: 'Đối thủ đã nhập tỷ số, hãy xác nhận kết quả trận đấu.',
        resourceType: 'match',
        resourceId: event.data.matchId,
        deepLink: `badminton://matches/${event.data.matchId}`,
        dedupeKey: `match:${event.data.matchId}:result:${event.data.resultId}:confirm_required`,
      });
    }
  }

  @OnEvent(Events.DisputeOpened)
  async onDisputeOpened(event: DomainEventEnvelope<MatchEventData>) {
    const recipients = await this.matchRecipients(event.data.matchId, event.data.actorUserId);
    for (const recipientId of recipients) {
      await this.notifications.create({
        recipientId,
        type: 'DISPUTE_OPENED',
        title: 'Có tranh chấp trận đấu',
        body: 'Một người chơi đã mở tranh chấp cho trận đấu.',
        resourceType: 'match',
        resourceId: event.data.matchId,
        deepLink: `badminton://matches/${event.data.matchId}`,
        dedupeKey: `dispute:${event.data.disputeId}:opened`,
      });
    }
  }

  @OnEvent(Events.RatingApplied)
  async onRatingApplied(event: DomainEventEnvelope<MatchEventData>) {
    const recipients = await this.matchRecipients(event.data.matchId);
    for (const recipientId of recipients) {
      const mine = event.data.perUser?.[recipientId];
      await this.notifications.create({
        recipientId,
        type: 'RATING_APPLIED',
        title: 'Elo đã được cập nhật',
        body: mine
          ? `Rating của bạn: ${mine.oldRating} → ${mine.newRating} (${mine.delta >= 0 ? '+' : ''}${mine.delta})`
          : 'Kết quả trận đã được tính điểm.',
        resourceType: 'match',
        resourceId: event.data.matchId,
        deepLink: `badminton://matches/${event.data.matchId}`,
        dedupeKey: `match:${event.data.matchId}:rating_applied`,
      });
    }
  }
}
