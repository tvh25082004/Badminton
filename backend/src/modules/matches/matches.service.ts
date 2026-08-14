import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { MatchPlayer } from './entities/match-player.entity';
import { MatchResult } from './entities/match-result.entity';
import { ResultConfirmation } from './entities/result-confirmation.entity';
import { Dispute } from './entities/dispute.entity';
import { CheckIn } from './entities/check-in.entity';
import { RatingProfile } from '../ratings/entities/rating-profile.entity';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { User } from '../auth/entities/user.entity';
import { RatingsService } from '../ratings/ratings.service';
import { AntiFraudService } from './anti-fraud.service';
import {
  BadRequestAppException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../common/errors/app-exception';
import { CreateScheduledMatchDto, SubmitResultDto, ConfirmResultDto, OpenDisputeDto, CheckInDto } from './dto/match.dto';
import { createEvent, Events } from '../../common/events/domain-event';

@Injectable()
export class MatchesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly events: EventEmitter2,
    private readonly ratings: RatingsService,
    private readonly antiFraud: AntiFraudService,
    @InjectRepository(Match) private readonly matches: Repository<Match>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayers: Repository<MatchPlayer>,
    @InjectRepository(MatchResult)
    private readonly results: Repository<MatchResult>,
    @InjectRepository(ResultConfirmation)
    private readonly confirmations: Repository<ResultConfirmation>,
    @InjectRepository(Dispute) private readonly disputes: Repository<Dispute>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(RatingProfile)
    private readonly ratingProfiles: Repository<RatingProfile>,
    @InjectRepository(PlayerProfile)
    private readonly profiles: Repository<PlayerProfile>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  // ------------------------------------------------------------------
  // Queries
  // ------------------------------------------------------------------

  async create(creatorId: string, dto: CreateScheduledMatchDto) {
    // CUSTOM format luôn unrated trong MVP (§9.2).
    const mode = dto.mode ?? 'RATED';
    if (dto.format === 'CUSTOM' && mode === 'RATED') {
      throw new BadRequestAppException(
        'MATCH_NOT_RATED',
        'CUSTOM format is unrated in MVP',
      );
    }

    const userIds = dto.players.map((p) => p.userId);
    if (new Set(userIds).size !== 4) {
      throw new BadRequestAppException(
        'MATCH_ROSTER_INVALID',
        'Match needs exactly 4 distinct players',
      );
    }
    if (dto.players.filter((p) => p.team === 'A').length !== 2) {
      throw new BadRequestAppException(
        'MATCH_ROSTER_INVALID',
        'Each team needs exactly 2 players',
      );
    }

    if (mode === 'RATED') {
      const profiles = await this.ratingProfiles.find({
        where: userIds.map((id) => ({ userId: id })),
      });
      if (profiles.length !== 4) {
        throw new BadRequestAppException(
          'MATCH_NOT_RATED',
          'All 4 players must complete the initial assessment to play a rated match',
        );
      }
    }

    const match = await this.matches.save(
      this.matches.create({
        creatorId,
        matchType: 'SCHEDULED',
        sessionId: dto.sessionId ?? null,
        venueId: dto.venueId ?? null,
        mode,
        format: dto.format,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: 'DRAFT',
      }),
    );

    for (const p of dto.players) {
      await this.matchPlayers.save(
        this.matchPlayers.create({
          matchId: match.id,
          userId: p.userId,
          team: p.team,
          rosterConfirmed: false,
        }),
      );
    }
    return this.detail(match.id);
  }

  async detail(matchId: string) {
    return this.detailWith(this.dataSource.manager, matchId);
  }

  /**
   * Chi tiết match chạy trên EntityManager truyền vào.
   * Dùng `em` bên trong transaction (confirm/void/dispute-resolve) để KHÔNG
   * lấy thêm connection từ main pool — tránh pool starvation khi transaction
   * đang giữ pessimistic lock mà pool đã bị các transaction chờ lock chiếm hết.
   */
  private async detailWith(em: EntityManager, matchId: string) {
    const matchRepo = em.getRepository(Match);
    const mpRepo = em.getRepository(MatchPlayer);
    const resultRepo = em.getRepository(MatchResult);
    const disputeRepo = em.getRepository(Dispute);
    const profileRepo = em.getRepository(PlayerProfile);
    const ratingRepo = em.getRepository(RatingProfile);
    const userRepo = em.getRepository(User);
    const confRepo = em.getRepository(ResultConfirmation);

    const match = await matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('MATCH_NOT_FOUND', 'Match not found');

    // Tuần tự (không Promise.all): em bên trong transaction chỉ có 1 connection,
    // chạy query song song trên cùng connection gây pg deprecation + lỗi giao thức.
    const players = await mpRepo.find({
      where: { matchId },
      order: { team: 'ASC', createdAt: 'ASC' },
    });
    const latestResult = await resultRepo.findOne({
      where: { matchId },
      order: { createdAt: 'DESC' },
    });
    const openDispute = await disputeRepo.findOne({ where: { matchId, status: 'OPEN' } });

    const enriched = [];
    for (const mp of players) {
      const profile = await profileRepo.findOne({ where: { userId: mp.userId } });
      const rating = await ratingRepo.findOne({ where: { userId: mp.userId } });
      const user = await userRepo.findOne({ where: { id: mp.userId } });
      enriched.push({
        userId: mp.userId,
        team: mp.team,
        rosterConfirmed: mp.rosterConfirmed,
        deviceId: mp.deviceId ?? null,
        joinedAt: mp.joinedAt,
        displayName: profile?.displayName ?? user?.displayName ?? 'Người chơi',
        region: profile?.region ?? null,
        rating: rating?.rating ?? null,
      });
    }

    const confirmationCount = latestResult
      ? await confRepo.count({ where: { matchResultId: latestResult.id } })
      : 0;

    return {
      ...match,
      players: enriched,
      latestResult: latestResult
        ? { ...latestResult, confirmedByCount: confirmationCount }
        : null,
      openDispute,
    };
  }

  async list(userId: string, opts: { status?: string; page: number; limit: number }) {
    const qb = this.matches
      .createQueryBuilder('m')
      .innerJoin(MatchPlayer, 'mp', 'mp.matchId = m.id AND mp.userId = :userId', { userId })
      .where('1=1');
    if (opts.status) {
      qb.andWhere('m.status = :status', { status: opts.status });
    }
    qb.orderBy('m.createdAt', 'DESC')
      .skip((opts.page - 1) * opts.limit)
      .take(opts.limit);
    const [items, total] = await qb.getManyAndCount();
    // Frontend cần players (tên, đội, xác nhận) ngay trên list.
    const withPlayers = await Promise.all(
      items.map((m) => this.detailWith(this.dataSource.manager, m.id)),
    );
    return { items: withPlayers, total, page: opts.page, limit: opts.limit };
  }

  // ------------------------------------------------------------------
  // Pre-match: roster confirm + check-in + start
  // ------------------------------------------------------------------

  async rosterConfirm(userId: string, matchId: string) {
    const match = await this.matches.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('MATCH_NOT_FOUND', 'Match not found');
    if (match.status !== 'DRAFT' && match.status !== 'READY') {
      throw new ConflictException(
        'MATCH_STATE_INVALID',
        `Roster is locked in state ${match.status}`,
      );
    }
    const mp = await this.matchPlayers.findOne({ where: { matchId, userId } });
    if (!mp) throw new ForbiddenException('You are not in this match');
    if (mp.rosterConfirmed) {
      return this.detail(matchId); // idempotent
    }

    mp.rosterConfirmed = true;
    await this.matchPlayers.save(mp);

    const all = await this.matchPlayers.find({ where: { matchId } });
    if (all.length === 4 && all.every((p) => p.rosterConfirmed)) {
      match.status = 'READY'; // roster locked
      await this.matches.save(match);
    }
    return this.detail(matchId);
  }

  async checkIn(
    userId: string,
    matchId: string,
    dto: CheckInDto,
    deviceId: string,
  ) {
    const match = await this.matches.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('MATCH_NOT_FOUND', 'Match not found');
    if (match.matchType === 'QUICK') {
      throw new ConflictException(
        'MATCH_STATE_INVALID',
        'Quick matches use QR roster, not check-in',
      );
    }
    if (!['READY', 'CHECKED_IN'].includes(match.status)) {
      throw new ConflictException(
        'MATCH_STATE_INVALID',
        `Cannot check in when match is ${match.status}`,
      );
    }
    const mp = await this.matchPlayers.findOne({ where: { matchId, userId } });
    if (!mp) throw new ForbiddenException('You are not in this match');

    const existing = await this.checkIns.findOne({ where: { matchId, userId } });
    if (!existing) {
      await this.checkIns.save(
        this.checkIns.create({
          matchId,
          userId,
          latitude: dto.latitude !== undefined ? String(dto.latitude) : null,
          longitude: dto.longitude !== undefined ? String(dto.longitude) : null,
          accuracyMeters: dto.accuracyMeters ?? null,
          deviceId,
          checkedInAt: new Date(),
        }),
      );
    }

    const checkedIn = await this.checkIns
      .createQueryBuilder('c')
      .where('c.matchId = :matchId', { matchId })
      .getCount();
    const allPlayers = await this.matchPlayers.count({ where: { matchId } });
    if (checkedIn >= allPlayers && match.status === 'READY') {
      match.status = 'CHECKED_IN';
      await this.matches.save(match);
    }
    return this.detail(matchId);
  }

  async start(userId: string, matchId: string) {
    const match = await this.matches.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('MATCH_NOT_FOUND', 'Match not found');
    if (match.creatorId !== userId) {
      throw new ForbiddenException('Only the match creator can start it');
    }
    if (match.status === 'PLAYING') return this.detail(matchId);

    if (match.matchType === 'QUICK') {
      if (match.status !== 'READY') {
        throw new ConflictException(
          'MATCH_STATE_INVALID',
          `Quick match must be READY to start (currently ${match.status})`,
        );
      }
    } else {
      if (!['READY', 'CHECKED_IN'].includes(match.status)) {
        throw new ConflictException(
          'MATCH_STATE_INVALID',
          `Cannot start match in state ${match.status}`,
        );
      }
      const checkedIn = await this.checkIns
        .createQueryBuilder('c')
        .where('c.matchId = :matchId', { matchId })
        .getCount();
      const allPlayers = await this.matchPlayers.count({ where: { matchId } });
      if (checkedIn < allPlayers) {
        throw new ConflictException(
          'MATCH_STATE_INVALID',
          'All players must check in before the match starts',
        );
      }
    }
    match.status = 'PLAYING';
    await this.matches.save(match);
    return this.detail(matchId);
  }

  // ------------------------------------------------------------------
  // Result + confirm + dispute
  // ------------------------------------------------------------------

  async submitResult(userId: string, matchId: string, dto: SubmitResultDto) {
    const match = await this.matches.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('MATCH_NOT_FOUND', 'Match not found');
    if (!['PLAYING', 'PENDING_CONFIRM'].includes(match.status)) {
      throw new ConflictException(
        'MATCH_STATE_INVALID',
        `Cannot submit result when match is ${match.status}`,
      );
    }
    const mp = await this.matchPlayers.findOne({ where: { matchId, userId } });
    if (!mp) throw new ForbiddenException('You are not in this match');
    const teamAScore = dto.scores?.teamA?.[0];
    const teamBScore = dto.scores?.teamB?.[0];
    if (typeof teamAScore !== 'number' || typeof teamBScore !== 'number') {
      throw new BadRequestAppException(
        'VALIDATION_FAILED',
        'scores.teamA and scores.teamB must each contain at least one number',
      );
    }
    if (teamAScore === teamBScore) {
      throw new BadRequestAppException(
        'VALIDATION_FAILED',
        'Scores cannot be equal in MVP (no draws)',
      );
    }

    // Upsert kết quả PENDING: đối thủ sửa tỷ số → cập nhật + reset confirm (§12.1.3).
    const existing = await this.results.findOne({
      where: { matchId, status: 'PENDING' },
      order: { createdAt: 'DESC' },
    });
    let result: MatchResult;
    if (existing && (existing.scores.teamA[0] !== teamAScore || existing.scores.teamB[0] !== teamBScore)) {
      existing.scores = { teamA: [teamAScore], teamB: [teamBScore] };
      existing.submittedById = userId;
      result = await this.results.save(existing);
      await this.confirmations
        .createQueryBuilder()
        .delete()
        .where('matchResultId = :rid', { rid: existing.id })
        .execute();
    } else if (!existing) {
      result = await this.results.save(
        this.results.create({
          matchId,
          scores: { teamA: [teamAScore], teamB: [teamBScore] },
          submittedById: userId,
          status: 'PENDING',
        }),
      );
    } else {
      result = existing;
    }

    match.status = 'PENDING_CONFIRM';
    await this.matches.save(match);

    this.events.emit(
      Events.MatchResultConfirmRequired,
      createEvent(Events.MatchResultConfirmRequired, {
        matchId,
        resultId: result.id,
        actorUserId: userId,
      }),
    );
    return this.detail(matchId);
  }

  /**
   * Confirm kết quả — idempotent + concurrency-safe.
   * Row lock trên Match để 2 confirm đồng thời không tạo 2 RatingTransaction (AC-7).
   */
  async confirmResult(userId: string, matchId: string, dto: ConfirmResultDto, deviceId?: string) {
    return this.dataSource.transaction(async (em) => {
      const match = await em.findOne(Match, {
        where: { id: matchId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!match) throw new NotFoundException('MATCH_NOT_FOUND', 'Match not found');
      if (match.status === 'RATED' || match.status === 'VOIDED') {
        return this.detailWith(em, matchId); // idempotent
      }
      // AC-10: Quick Rated Match confirm bắt buộc mobile device (§10.2).
      if (match.matchType === 'QUICK' && !deviceId) {
        throw new BadRequestAppException(
          'MATCH_NEEDS_MOBILE',
          'Confirming a Quick Rated Match requires the mobile app',
        );
      }
      if (match.status !== 'PENDING_CONFIRM') {
        throw new ConflictException(
          'MATCH_STATE_INVALID',
          `Cannot confirm result when match is ${match.status}`,
        );
      }

      const mp = await em.findOne(MatchPlayer, { where: { matchId, userId } });
      if (!mp) throw new ForbiddenException('You are not in this match');

      const resultRepo = em.getRepository(MatchResult);
      const confRepo = em.getRepository(ResultConfirmation);
      const result = dto.resultId
        ? await resultRepo.findOne({ where: { id: dto.resultId, matchId } })
        : await resultRepo.findOne({
            where: { matchId, status: 'PENDING' },
            order: { createdAt: 'DESC' },
          });
      if (!result) {
        throw new NotFoundException('MATCH_RESULT_NOT_FOUND', 'No pending result to confirm');
      }

      // Idempotent per user (unique resultId+userId).
      const existingConf = await confRepo.findOne({
        where: { matchResultId: result.id, userId },
      });
      if (!existingConf) {
        await confRepo.save(
          confRepo.create({
            matchResultId: result.id,
            userId,
            confirmedAt: new Date(),
          }),
        );
      }

      const players = await em.find(MatchPlayer, { where: { matchId } });
      const myTeam = mp.team;
      const confirms = await confRepo.find({ where: { matchResultId: result.id } });
      const confirmedUserIds = new Set(confirms.map((c) => c.userId));
      const confirmedTeams = new Set(
        players.filter((p) => confirmedUserIds.has(p.userId)).map((p) => p.team),
      );
      const opponentTeamConfirmed = confirmedTeams.has(myTeam === 'A' ? 'B' : 'A');

      const openDispute = await em.findOne(Dispute, {
        where: { matchId, status: 'OPEN' },
      });

      // §12.1: cần ≥1 đại diện phía đối thủ + §9.3: ≥3/4 confirm.
      if (confirmedUserIds.size < 3 || !opponentTeamConfirmed || openDispute) {
        return this.detailWith(em, matchId);
      }

      // Đủ điều kiện → chống gian lận trước khi commit (AC-6/§9.2).
      const playerIds = players
        .sort((a, b) =>
          a.team === b.team ? a.createdAt.getTime() - b.createdAt.getTime() : a.team < b.team ? -1 : 1,
        )
        .map((p) => p.userId);
      const priorMeetings = await this.antiFraud.countPriorMeetings(em, matchId, playerIds, new Date());
      const af = await this.antiFraud.evaluate(em, match, playerIds, priorMeetings);

      if (af.flagged) {
        match.status = 'PENDING_REVIEW';
        match.antiFraudDecision = 'REVIEW';
        match.antiFraudSignals = { reasons: af.reasons, priorMeetings };
        await em.save(match);
        return this.detailWith(em, matchId);
      }

      // Commit Elo nguyên tử.
      const profiles = await em.find(RatingProfile, {
        where: playerIds.map((id) => ({ userId: id })),
      });
      const profileMap = new Map(profiles.map((p) => [p.userId, p]));
      const teamAScore = result.scores.teamA[0] ?? 0;
      const teamBScore = result.scores.teamB[0] ?? 0;
      const winner: 'A' | 'B' = teamAScore > teamBScore ? 'A' : 'B';

      const commit = await this.ratings.commitMatchRatings(em, {
        matchId,
        winner,
        format: match.format as 'BEST_OF_3' | 'SINGLE_GAME_21' | 'CUSTOM',
        players: playerIds.map((id) => {
          const p = profileMap.get(id)!;
          return { userId: id, rating: p.rating, ratedMatches: p.ratedMatches };
        }),
        previousMeetingsWithin7d: priorMeetings,
      });

      match.status = 'RATED';
      match.ratedAt = new Date();
      result.status = 'CONFIRMED';
      await em.save(match);
      await resultRepo.save(result);

      this.events.emit(
        Events.RatingApplied,
        createEvent(Events.RatingApplied, {
          matchId,
          perUser: commit.perUser,
        }),
      );
      return this.detailWith(em, matchId);
    });
  }

  async openDispute(userId: string, matchId: string, dto: OpenDisputeDto) {
    return this.dataSource.transaction(async (em) => {
      const match = await em.findOne(Match, {
        where: { id: matchId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!match) throw new NotFoundException('MATCH_NOT_FOUND', 'Match not found');
      if (!['PLAYING', 'PENDING_CONFIRM', 'CONFIRMED'].includes(match.status)) {
        throw new ConflictException(
          'MATCH_STATE_INVALID',
          `Cannot dispute a ${match.status} match`,
        );
      }
      const mp = await em.findOne(MatchPlayer, { where: { matchId, userId } });
      if (!mp) throw new ForbiddenException('You are not in this match');

      const existing = await em.findOne(Dispute, { where: { matchId, status: 'OPEN' } });
      if (existing) {
        throw new ConflictException('DISPUTE_ALREADY_OPEN', 'A dispute is already open for this match');
      }

      const dispute = await em.save(
        em.create(Dispute, {
          matchId,
          openedByUserId: userId,
          reason: dto.reason,
          evidenceUrls: dto.evidenceUrls ?? [],
          status: 'OPEN',
        }),
      );

      match.status = 'DISPUTED';
      await em.save(match);

      this.events.emit(
        Events.DisputeOpened,
        createEvent(Events.DisputeOpened, { matchId, disputeId: dispute.id, actorUserId: userId }),
      );
      return { dispute, matchStatus: match.status };
    });
  }

  // ------------------------------------------------------------------
  // Moderation hooks (gọi từ AdminModule) — mọi mutation có audit ở admin
  // ------------------------------------------------------------------

  async resolveDisputeKeepResult(matchId: string, disputeId: string) {
    return this.dataSource.transaction(async (em) => {
      const dispute = await em.findOne(Dispute, {
        where: { id: disputeId, matchId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!dispute) throw new NotFoundException('DISPUTE_NOT_FOUND', 'Dispute not found');
      if (dispute.status !== 'OPEN') {
        throw new ConflictException('DISPUTE_ALREADY_RESOLVED', 'Dispute already resolved');
      }
      const match = await em.findOne(Match, {
        where: { id: matchId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!match) throw new NotFoundException('MATCH_NOT_FOUND', 'Match not found');

      dispute.status = 'RESOLVED';
      dispute.decision = 'KEEP_RESULT';
      dispute.resolvedAt = new Date();
      await em.save(dispute);

      const resultRepo = em.getRepository(MatchResult);
      const result = await resultRepo.findOne({
        where: { matchId, status: 'PENDING' },
        order: { createdAt: 'DESC' },
      });
      if (!result) {
        throw new ConflictException('MATCH_RESULT_NOT_FOUND', 'No pending result to keep');
      }

      const players = await em.find(MatchPlayer, { where: { matchId } });
      const playerIds = players
        .sort((a, b) =>
          a.team === b.team ? a.createdAt.getTime() - b.createdAt.getTime() : a.team < b.team ? -1 : 1,
        )
        .map((p) => p.userId);
      const priorMeetings = await this.antiFraud.countPriorMeetings(em, matchId, playerIds, new Date());
      const af = await this.antiFraud.evaluate(em, match, playerIds, priorMeetings);

      if (af.flagged) {
        match.status = 'PENDING_REVIEW';
        match.antiFraudDecision = 'REVIEW';
        match.antiFraudSignals = { reasons: af.reasons };
        await em.save(match);
        return this.detailWith(em, matchId);
      }

      const profiles = await em.find(RatingProfile, {
        where: playerIds.map((id) => ({ userId: id })),
      });
      const profileMap = new Map(profiles.map((p) => [p.userId, p]));
      const winner: 'A' | 'B' =
        (result.scores.teamA[0] ?? 0) > (result.scores.teamB[0] ?? 0) ? 'A' : 'B';
      const commit = await this.ratings.commitMatchRatings(em, {
        matchId,
        winner,
        format: match.format as 'BEST_OF_3' | 'SINGLE_GAME_21' | 'CUSTOM',
        players: playerIds.map((id) => {
          const p = profileMap.get(id)!;
          return { userId: id, rating: p.rating, ratedMatches: p.ratedMatches };
        }),
        previousMeetingsWithin7d: priorMeetings,
      });

      match.status = 'RATED';
      match.ratedAt = new Date();
      result.status = 'CONFIRMED';
      await em.save(match);
      await resultRepo.save(result);

      this.events.emit(
        Events.RatingApplied,
        createEvent(Events.RatingApplied, { matchId, perUser: commit.perUser }),
      );
      return this.detailWith(em, matchId);
    });
  }

  /** Void match (đã rated hoặc chưa) — tạo REVERSAL + recompute metadata (§14.2). */
  async voidMatch(matchId: string, reason: string, actorId?: string | null) {
    return this.dataSource.transaction(async (em) => {
      const match = await em.findOne(Match, {
        where: { id: matchId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!match) throw new NotFoundException('MATCH_NOT_FOUND', 'Match not found');
      if (match.status === 'VOIDED') {
        throw new ConflictException('VOID_NOT_ALLOWED', 'Match is already voided');
      }

      const players = await em.find(MatchPlayer, { where: { matchId } });
      const playerIds = players.map((p) => p.userId);

      if (match.status === 'RATED') {
        await this.ratings.recomputeAfterVoid(em, matchId, playerIds);
      }

      await em
        .createQueryBuilder()
        .update(Dispute)
        .set({ status: 'RESOLVED', decision: 'VOID_MATCH', resolvedAt: new Date(), resolvedById: actorId ?? null })
        .where('matchId = :matchId', { matchId })
        .andWhere('status = :status', { status: 'OPEN' })
        .execute();

      match.status = 'VOIDED';
      match.voidedAt = new Date();
      match.voidedById = actorId ?? null;
      await em.save(match);
      return this.detailWith(em, matchId);
    });
  }
}
