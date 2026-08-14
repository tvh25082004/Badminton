import { randomUUID } from 'crypto';

export interface DomainEventEnvelope<T = unknown> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  tenantId?: string;
  correlationId?: string;
  causationId?: string;
  data: T;
}

export function createEvent<T>(
  eventType: string,
  data: T,
  opts?: { correlationId?: string; causationId?: string; eventVersion?: number },
): DomainEventEnvelope<T> {
  return {
    eventId: randomUUID(),
    eventType,
    eventVersion: opts?.eventVersion ?? 1,
    occurredAt: new Date().toISOString(),
    correlationId: opts?.correlationId,
    causationId: opts?.causationId,
    data,
  };
}

export const Events = {
  SessionJoined: 'session.participant.joined',
  SessionLeft: 'session.participant.left',
  SessionUpdated: 'session.updated',
  MatchResultConfirmRequired: 'match.result.confirm_required',
  DisputeOpened: 'dispute.opened',
  DisputeUpdated: 'dispute.updated',
  RatingApplied: 'rating.applied',
} as const;
