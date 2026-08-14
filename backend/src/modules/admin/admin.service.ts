import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { RatingProfile } from '../ratings/entities/rating-profile.entity';
import { RatingTransaction } from '../ratings/entities/rating-transaction.entity';
import { Match } from '../matches/entities/match.entity';
import { MatchPlayer } from '../matches/entities/match-player.entity';
import { MatchResult } from '../matches/entities/match-result.entity';
import { Dispute } from '../matches/entities/dispute.entity';
import { CheckIn } from '../matches/entities/check-in.entity';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { UserService } from '../users/users.service';
import { MatchesService } from '../matches/matches.service';
import { AuditService } from '../audit/audit.service';
import { EloConfigService } from '../../database/services/elo-config.service';
import {
  BadRequestAppException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../common/errors/app-exception';

export interface RequestContext {
  requestId?: string;
  ip?: string;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly users: UserService,
    private readonly matchesService: MatchesService,
    private readonly audit: AuditService,
    private readonly eloConfig: EloConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PlayerProfile)
    private readonly profiles: Repository<PlayerProfile>,
    @InjectRepository(RatingProfile)
    private readonly ratings: Repository<RatingProfile>,
    @InjectRepository(RatingTransaction)
    private readonly txns: Repository<RatingTransaction>,
    @InjectRepository(Match) private readonly matches: Repository<Match>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayers: Repository<MatchPlayer>,
    @InjectRepository(MatchResult)
    private readonly results: Repository<MatchResult>,
    @InjectRepository(Dispute) private readonly disputes: Repository<Dispute>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(SessionParticipant)
    private readonly participants: Repository<SessionParticipant>,
  ) {}

  // ------------------------------------------------------------------
  // User moderation (§14.1)
  // ------------------------------------------------------------------

  /**
   * Moderator chỉ suspend/unsuspend Player; Admin được thao tác Player/Moderator.
   * Không suspend Admin, không tự moderate bản thân, không đổi role qua API.
   */
  private assertCanModerate(actor: User, target: User) {
    if (actor.id === target.id) {
      throw new BadRequestAppException('FORBIDDEN', 'Cannot moderate yourself');
    }
    if (target.role === 'ADMIN') {
      throw new ForbiddenException('Cannot moderate an Admin');
    }
    if (actor.role === 'MODERATOR' && target.role !== 'PLAYER') {
      throw new ForbiddenException('Moderator can only moderate Players');
    }
  }

  async suspendUser(
    actor: User,
    targetId: string,
    reason: string,
    idempotencyKey: string | undefined,
    ctx: RequestContext,
  ) {
    const target = await this.users.findById(targetId);
    this.assertCanModerate(actor, target);

    if (idempotencyKey) {
      const existing = await this.audit.list({
        page: 1,
        limit: 1,
        action: 'user.suspend',
      });
      const dup = existing.items.find(
        (a) => a.idempotencyKey === idempotencyKey && a.resourceId === targetId,
      );
      if (dup) return { ok: true, status: target.status, idempotent: true };
    }

    if (target.status === 'SUSPENDED') {
      throw new ConflictException('USER_ALREADY_SUSPENDED', 'User is already suspended');
    }

    const before = target.status;
    target.status = 'SUSPENDED';
    await this.userRepo.save(target);

    await this.audit.log({
      actorId: actor.id,
      action: 'user.suspend',
      resourceType: 'user',
      resourceId: targetId,
      before: { status: before },
      after: { status: 'SUSPENDED' },
      reason,
      requestId: ctx.requestId,
      ip: ctx.ip,
      idempotencyKey,
    });
    return { ok: true, status: target.status };
  }

  async unsuspendUser(
    actor: User,
    targetId: string,
    reason: string,
    idempotencyKey: string | undefined,
    ctx: RequestContext,
  ) {
    const target = await this.users.findById(targetId);
    this.assertCanModerate(actor, target);

    if (idempotencyKey) {
      const existing = await this.audit.list({ page: 1, limit: 1, action: 'user.unsuspend' });
      const dup = existing.items.find(
        (a) => a.idempotencyKey === idempotencyKey && a.resourceId === targetId,
      );
      if (dup) return { ok: true, status: target.status, idempotent: true };
    }

    if (target.status !== 'SUSPENDED') {
      throw new ConflictException('USER_NOT_SUSPENDED', 'User is not suspended');
    }

    const before = target.status;
    target.status = 'ACTIVE';
    await this.userRepo.save(target);

    await this.audit.log({
      actorId: actor.id,
      action: 'user.unsuspend',
      resourceType: 'user',
      resourceId: targetId,
      before: { status: before },
      after: { status: 'ACTIVE' },
      reason,
      requestId: ctx.requestId,
      ip: ctx.ip,
      idempotencyKey,
    });
    return { ok: true, status: target.status };
  }

  async searchUsers(q?: string, page = 1, limit = 20) {
    const result = await this.users.search(q, page, limit);
    // Moderator/Admin được xem phone đầy đủ (§14.1) — không log phone vào audit.
    return result;
  }

  // ------------------------------------------------------------------
  // Inspection (read-only + access audit) — §14.1
  // ------------------------------------------------------------------

  async inspectUser(actor: User, targetId: string, ctx: RequestContext) {
    const user = await this.userRepo.findOne({ where: { id: targetId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND', 'User not found');

    // Access audit phải ghi được — nếu không, inspection thất bại.
    await this.audit.log({
      actorId: actor.id,
      action: 'inspection.user',
      resourceType: 'user',
      resourceId: targetId,
      reason: 'sensitive data inspection',
      requestId: ctx.requestId,
      ip: ctx.ip,
    });

    const [profile, rating, history, sessions, checkins] = await Promise.all([
      this.profiles.findOne({ where: { userId: targetId } }),
      this.ratings.findOne({ where: { userId: targetId } }),
      this.txns.find({ where: { userId: targetId }, order: { createdAt: 'DESC' }, take: 100 }),
      this.participants.find({ where: { userId: targetId }, order: { createdAt: 'DESC' }, take: 50 }),
      this.checkIns.find({ where: { userId: targetId }, order: { checkedInAt: 'DESC' }, take: 50 }),
    ]);

    return {
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      profile,
      rating,
      ratingHistory: history,
      sessions: sessions.map((s) => ({ sessionId: s.sessionId, status: s.status, joinedAt: s.createdAt })),
      checkIns: checkins,
    };
  }

  async inspectMatch(actor: User, matchId: string, ctx: RequestContext) {
    const match = await this.matches.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('MATCH_NOT_FOUND', 'Match not found');

    await this.audit.log({
      actorId: actor.id,
      action: 'inspection.match',
      resourceType: 'match',
      resourceId: matchId,
      reason: 'sensitive data inspection',
      requestId: ctx.requestId,
      ip: ctx.ip,
    });

    const [players, results, disputes, checkins, txns] = await Promise.all([
      this.matchPlayers.find({ where: { matchId } }),
      this.results.find({ where: { matchId }, order: { createdAt: 'DESC' } }),
      this.disputes.find({ where: { matchId } }),
      this.checkIns.find({ where: { matchId } }),
      this.txns.find({ where: { matchId }, order: { createdAt: 'ASC' } }),
    ]);
    return { match, players, results, disputes, checkIns: checkins, ratingTransactions: txns };
  }

  // ------------------------------------------------------------------
  // Dispute + void (mutation có audit) — §12.2, §14.2
  // ------------------------------------------------------------------

  async listDisputes(page = 1, limit = 20, status?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const [items, total] = await this.disputes.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async resolveDispute(
    actor: User,
    disputeId: string,
    decision: 'KEEP_RESULT' | 'VOID_MATCH',
    reason: string | undefined,
    ctx: RequestContext,
  ) {
    const dispute = await this.disputes.findOne({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('DISPUTE_NOT_FOUND', 'Dispute not found');
    if (dispute.status !== 'OPEN') {
      throw new ConflictException('DISPUTE_ALREADY_RESOLVED', 'Dispute already resolved');
    }

    let result;
    if (decision === 'KEEP_RESULT') {
      result = await this.matchesService.resolveDisputeKeepResult(
        dispute.matchId,
        disputeId,
      );
    } else {
      result = await this.matchesService.voidMatch(dispute.matchId, reason ?? 'dispute resolved as void');
    }

    await this.audit.log({
      actorId: actor.id,
      action: 'dispute.resolve',
      resourceType: 'dispute',
      resourceId: disputeId,
      before: { status: dispute.status },
      after: { status: 'RESOLVED', decision },
      reason: reason ?? null,
      requestId: ctx.requestId,
      ip: ctx.ip,
    });
    return { ok: true, decision, matchId: dispute.matchId };
  }

  async voidMatch(
    actor: User,
    matchId: string,
    reason: string,
    idempotencyKey: string | undefined,
    ctx: RequestContext,
  ) {
    if (idempotencyKey) {
      const existing = await this.audit.list({ page: 1, limit: 1, action: 'match.void' });
      const dup = existing.items.find(
        (a) => a.idempotencyKey === idempotencyKey && a.resourceId === matchId,
      );
      if (dup) return { ok: true, idempotent: true };
    }

    const match = await this.matches.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('MATCH_NOT_FOUND', 'Match not found');

    await this.matchesService.voidMatch(matchId, reason);

    await this.audit.log({
      actorId: actor.id,
      action: 'match.void',
      resourceType: 'match',
      resourceId: matchId,
      before: { status: match.status },
      after: { status: 'VOIDED' },
      reason,
      requestId: ctx.requestId,
      ip: ctx.ip,
      idempotencyKey,
    });
    return { ok: true, matchId };
  }

  // ------------------------------------------------------------------
  // Elo config (ADMIN) — audit
  // ------------------------------------------------------------------

  async getEloConfig() {
    return this.eloConfig.all();
  }

  async updateEloConfig(actor: User, key: string, value: unknown, ctx: RequestContext) {
    const before = await this.eloConfig.get<unknown>(key).catch(() => undefined);
    await this.eloConfig.set(key, value, actor.id);

    await this.audit.log({
      actorId: actor.id,
      action: 'elo_config.update',
      resourceType: 'elo_config',
      resourceId: key,
      before: before !== undefined ? { [key]: before } : null,
      after: { [key]: value },
      reason: null,
      requestId: ctx.requestId,
      ip: ctx.ip,
    });
    return this.eloConfig.all();
  }

  async auditLogs(page = 1, limit = 20, action?: string, actorId?: string) {
    return this.audit.list({ page, limit, action, actorId });
  }
}
