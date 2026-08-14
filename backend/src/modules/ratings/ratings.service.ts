import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { RatingProfile } from './entities/rating-profile.entity';
import { RatingTransaction } from './entities/rating-transaction.entity';
import { SelfAssessment } from './entities/self-assessment.entity';
import { MatchPlayer } from '../matches/entities/match-player.entity';
import { Match } from '../matches/entities/match.entity';
import { computeEloDelta } from '../../domain/elo/elo-calculator';
import { evaluateAssessment, AssessmentRejected } from '../../domain/assessment/self-assessment';
import { EloConfigService } from '../../database/services/elo-config.service';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { User } from '../auth/entities/user.entity';
import {
  BadRequestAppException,
  ConflictException,
} from '../../common/errors/app-exception';

export interface CommitInput {
  matchId: string;
  winner: 'A' | 'B';
  format: 'BEST_OF_3' | 'SINGLE_GAME_21' | 'CUSTOM';
  /** order: [a1, a2, b1, b2] */
  players: Array<{ userId: string; rating: number; ratedMatches: number }>;
  /** Số lần gặp trước đó (max 4 cặp chéo, cửa sổ 7 ngày) → repeated_opponent_weight */
  previousMeetingsWithin7d: number;
}

export interface CommitResult {
  perUser: Record<string, { oldRating: number; newRating: number; delta: number }>;
}

@Injectable()
export class RatingsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(RatingProfile)
    private readonly profiles: Repository<RatingProfile>,
    @InjectRepository(RatingTransaction)
    private readonly txns: Repository<RatingTransaction>,
    @InjectRepository(SelfAssessment)
    private readonly assessments: Repository<SelfAssessment>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayers: Repository<MatchPlayer>,
    @InjectRepository(Match)
    private readonly matches: Repository<Match>,
    private readonly eloConfig: EloConfigService,
  ) {}

  async profileOf(userId: string): Promise<RatingProfile | null> {
    return this.profiles.findOne({ where: { userId } });
  }

  // ------------------------------------------------------------------
  // Self-assessment (Requirement §6)
  // ------------------------------------------------------------------

  /**
   * Nộp self-assessment → RatingProfile PROVISIONAL. Chỉ 1 lần.
   * Backend tính điểm/band/rating; client chỉ gửi question_id/value.
   */
  async submitAssessment(
    userId: string,
    schemaVersion: string,
    answers: Array<{ questionId: string; value: string }>,
  ) {
    const existing = await this.profiles.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException(
        'ASSESSMENT_ALREADY_COMPLETED',
        'You have already completed the initial assessment',
      );
    }

    let result;
    try {
      result = evaluateAssessment(schemaVersion, answers);
    } catch (e) {
      if (e instanceof AssessmentRejected) {
        throw new BadRequestAppException(
          e.reason === 'INVALID_SCHEMA'
            ? 'ASSESSMENT_INVALID_SCHEMA'
            : e.reason === 'INCONSISTENT'
              ? 'ASSESSMENT_INCONSISTENT'
              : 'VALIDATION_FAILED',
          `Assessment rejected: ${e.message}`,
        );
      }
      throw e;
    }

    if (result.consistency !== 'OK') {
      throw new BadRequestAppException(
        'ASSESSMENT_INCONSISTENT',
        'Your self-level is inconsistent with your answers, please review',
      );
    }

    const [floor, ceiling, initialDeviation] = await Promise.all([
      this.eloConfig.get<number>('rating_floor'),
      this.eloConfig.get<number>('rating_ceiling'),
      this.eloConfig.get<number>('deviation_start'),
    ]);
    const rating = Math.min(Math.max(result.rating, floor), ceiling);

    const profile = await this.dataSource.transaction(async (em) => {
      const assessment = await em.save(
        em.create(SelfAssessment, {
          userId,
          schemaVersion: result.schemaVersion,
          answers,
          totalScore: result.totalScore,
          band: result.band,
          rating,
        }),
      );
      const created = await em.save(
        em.create(RatingProfile, {
          userId,
          type: 'DOUBLES',
          rating,
          ratingDeviation: initialDeviation,
          ratingState: 'PROVISIONAL',
          ratedMatches: 0,
          uniqueOpponents: 0,
          algorithmVersion: 'elo.doubles.v1',
        }),
      );
      await em.save(
        em.create(RatingTransaction, {
          userId,
          matchId: null,
          type: 'INITIAL',
          ratingBefore: 0,
          delta: rating,
          ratingAfter: rating,
          algorithmVersion: 'elo.doubles.v1',
          state: 'APPLIED',
          metadata: { assessmentId: assessment.id, band: result.band, totalScore: result.totalScore },
        }),
      );
      return created;
    });

    return { rating: profile.rating, band: result.band, ratingState: profile.ratingState };
  }

  async getMyRating(userId: string) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) return null;
    const [provisionalThreshold, floor, ceiling] = await Promise.all([
      this.eloConfig.get<number>('provisional_matches'),
      this.eloConfig.get<number>('rating_floor'),
      this.eloConfig.get<number>('rating_ceiling'),
    ]);
    return {
      ...profile,
      confidence: profile.ratingState === 'ESTABLISHED' ? 'established' : 'provisional',
      nextMilestone:
        profile.ratedMatches < provisionalThreshold
          ? provisionalThreshold - profile.ratedMatches
          : 0,
      floor,
      ceiling,
    };
  }

  /**
   * Leaderboard chính (Requirement §11.3):
   * rated_matches >= 10, unique_opponents >= 6, ratingState != UNDER_REVIEW.
   */
  async leaderboard(opts: { region?: string; page: number; limit: number }) {
    const [minMatches, minOpponents] = await Promise.all([
      this.eloConfig.get<number>('leaderboard_min_rated_matches'),
      this.eloConfig.get<number>('leaderboard_min_unique_opponents'),
    ]);

    const base = (qb: import('typeorm').SelectQueryBuilder<RatingProfile>) => {
      qb.innerJoin(User, 'u', 'u.id = r.userId')
        .innerJoin(PlayerProfile, 'p', 'p.userId = r.userId')
        .where('r.ratedMatches >= :minMatches', { minMatches })
        .andWhere('r.uniqueOpponents >= :minOpponents', { minOpponents })
        .andWhere('r.ratingState != :underReview', { underReview: 'UNDER_REVIEW' });
      if (opts.region) {
        qb.andWhere('p.region = :region', { region: opts.region });
      }
    };

    // Dùng raw SQL (positional params) để tránh lỗi alias của TypeORM getCount()
    // với inner join + select tùy biến. pg driver yêu cầu mảng giá trị, không nhận object.
    const whereClauses = [
      'r."ratedMatches" >= $1',
      'r."uniqueOpponents" >= $2',
      'r."ratingState" != $3',
    ];
    const params: unknown[] = [minMatches, minOpponents, 'UNDER_REVIEW'];
    if (opts.region) {
      whereClauses.push(`p."region" = $${params.length + 1}`);
      params.push(opts.region);
    }
    const whereSql = whereClauses.join('\n       AND ');
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const rows = (await this.profiles.manager.query(
      `SELECT r."userId" AS "userId", r."rating" AS rating, r."ratingDeviation" AS "ratingDeviation",
              r."ratingState" AS "ratingState", r."ratedMatches" AS "ratedMatches",
              r."uniqueOpponents" AS "uniqueOpponents",
              p."displayName" AS "displayName", p."region" AS region, u."role" AS role
       FROM rating_profiles r
       INNER JOIN users u ON u.id = r."userId"
       INNER JOIN player_profiles p ON p."userId" = r."userId"
       WHERE ${whereSql}
       ORDER BY r."rating" DESC, r."ratingDeviation" ASC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, opts.limit, (opts.page - 1) * opts.limit],
    )) as Array<Record<string, unknown>>;
    const totalRows: Array<{ count: string }> = await this.profiles.manager.query(
      `SELECT COUNT(*) AS count
       FROM rating_profiles r
       INNER JOIN users u ON u.id = r."userId"
       INNER JOIN player_profiles p ON p."userId" = r."userId"
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(totalRows[0]?.count ?? 0);

    return {
      items: rows.map((r, i) => ({ rank: (opts.page - 1) * opts.limit + i + 1, ...r })),
      meta: { page: opts.page, limit: opts.limit, total, totalPages: Math.ceil(total / opts.limit) },
    };
  }

  /** Lịch sử rating transaction của user (kèm thông tin match). */
  async history(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.txns.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const matchIds = items
      .map((t) => t.matchId)
      .filter((id): id is string => !!id);
    const matches =
      matchIds.length > 0
        ? await this.matches.find({ where: { id: In(matchIds) } })
        : [];
    const matchMap = new Map(matches.map((m) => [m.id, m]));

    return {
      items: items.map((t) => ({
        id: t.id,
        type: t.type,
        ratingBefore: t.ratingBefore,
        delta: t.delta,
        ratingAfter: t.ratingAfter,
        state: t.state,
        algorithmVersion: t.algorithmVersion,
        refTransactionId: t.refTransactionId,
        createdAt: t.createdAt,
        match: t.matchId
          ? matchMap.get(t.matchId)
            ? {
                id: t.matchId,
                status: matchMap.get(t.matchId)!.status,
                format: matchMap.get(t.matchId)!.format,
                ratedAt: matchMap.get(t.matchId)!.ratedAt,
              }
            : { id: t.matchId, type: 'UNKNOWN' }
          : { id: null, type: 'INITIAL' },
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ------------------------------------------------------------------
  // Commit rating cho match đã đủ điều kiện (gọi TRONG transaction của MatchesService)
  // ------------------------------------------------------------------

  async commitMatchRatings(
    em: EntityManager,
    input: CommitInput,
  ): Promise<CommitResult> {
    if (input.format === 'CUSTOM') {
      throw new ConflictException(
        'MATCH_NOT_RATED',
        'CUSTOM format matches are unrated in MVP',
      );
    }

    const outcome = computeEloDelta({
      teamA: [
        { rating: input.players[0].rating, ratedMatches: input.players[0].ratedMatches },
        { rating: input.players[1].rating, ratedMatches: input.players[1].ratedMatches },
      ],
      teamB: [
        { rating: input.players[2].rating, ratedMatches: input.players[2].ratedMatches },
        { rating: input.players[3].rating, ratedMatches: input.players[3].ratedMatches },
      ],
      winner: input.winner,
      format: input.format as 'BEST_OF_3' | 'SINGLE_GAME_21',
      previousMeetingsWithin7d: input.previousMeetingsWithin7d,
    });

    const profileRepo = em.getRepository(RatingProfile);
    const txnRepo = em.getRepository(RatingTransaction);
    const mpRepo = em.getRepository(MatchPlayer);
    const matchRepo = em.getRepository(Match);

    const deltas = outcome.deltas;
    const order = ['a1', 'a2', 'b1', 'b2'] as const;
    const perUser: Record<string, { oldRating: number; newRating: number; delta: number }> = {};

    for (let i = 0; i < 4; i++) {
      const p = input.players[i];
      const d = deltas[order[i]];
      const profile = await profileRepo.findOne({ where: { userId: p.userId } });
      if (!profile) {
        throw new ConflictException(
          'MATCH_PLAYER_NO_RATING',
          `Player ${p.userId} has no rating profile`,
        );
      }

      const oldRating = profile.rating;
      const delta = d.delta;
      const newRating = oldRating + delta;

      // Đọc qua em (không dùng main pool) — transaction đang giữ pessimistic lock.
      const deviationStep = await this.eloConfig.getFor<number>(em, 'deviation_step');
      const deviationFloor = await this.eloConfig.getFor<number>(em, 'deviation_floor');
      const provisionalThreshold = await this.eloConfig.getFor<number>(em, 'provisional_matches');

      const newMatches = profile.ratedMatches + 1;
      profile.rating = newRating;
      profile.ratingDeviation = Math.max(deviationFloor, profile.ratingDeviation - deviationStep);
      profile.ratedMatches = newMatches;
      profile.lastRankedAt = new Date();
      profile.ratingState =
        newMatches >= provisionalThreshold ? 'ESTABLISHED' : 'PROVISIONAL';
      profile.uniqueOpponents = await this.countUniqueOpponents(em, p.userId, input.matchId, []);
      await profileRepo.save(profile);

      await txnRepo.save(
        txnRepo.create({
          userId: p.userId,
          matchId: input.matchId,
          type: 'MATCH_RESULT',
          ratingBefore: oldRating,
          delta,
          ratingAfter: newRating,
          algorithmVersion: outcome.algorithmVersion,
          state: 'APPLIED',
        }),
      );

      perUser[p.userId] = { oldRating, newRating, delta };
    }

    return { perUser };
  }

  /**
   * Đếm số đối thủ khác nhau của user trong các trận RATED.
   */
  async countUniqueOpponents(
    em: EntityManager,
    userId: string,
    currentMatchId: string,
    extraOpponents: string[],
  ): Promise<number> {
    const mpRepo = em.getRepository(MatchPlayer);
    const matchRepo = em.getRepository(Match);
    const myMatches = await mpRepo.find({ where: { userId } });
    const opponents = new Set<string>(extraOpponents);
    for (const mp of myMatches) {
      if (mp.matchId === currentMatchId && extraOpponents.length === 0) continue;
      const match = await matchRepo.findOne({ where: { id: mp.matchId } });
      if (!match || match.status !== 'RATED') continue;
      const mates = await mpRepo.find({ where: { matchId: mp.matchId } });
      for (const m of mates) {
        if (m.userId !== userId) opponents.add(m.userId);
      }
    }
    return opponents.size;
  }

  // ------------------------------------------------------------------
  // Void match đã RATED → REVERSAL + recompute metadata (Requirement §14.2)
  // ------------------------------------------------------------------

  async recomputeAfterVoid(
    em: EntityManager,
    matchId: string,
    playerIds: string[],
  ): Promise<void> {
    const txnRepo = em.getRepository(RatingTransaction);
    const profileRepo = em.getRepository(RatingProfile);
    const mpRepo = em.getRepository(MatchPlayer);
    const matchRepo = em.getRepository(Match);

    for (const userId of playerIds) {
      const originals = await txnRepo.find({
        where: { userId, matchId, type: 'MATCH_RESULT', state: 'APPLIED' },
      });
      if (originals.length === 0) continue;

      const alreadyReversed = await txnRepo.findOne({
        where: { userId, matchId, refTransactionId: In(originals.map((o) => o.id)) },
      });
      if (alreadyReversed) continue; // idempotent

      const profile = await profileRepo.findOne({ where: { userId } });
      if (!profile) continue;

      for (const original of originals) {
        const reversal = txnRepo.create({
          userId,
          matchId,
          type: 'REVERSAL',
          ratingBefore: original.ratingAfter,
          delta: -original.delta,
          ratingAfter: original.ratingBefore,
          algorithmVersion: original.algorithmVersion,
          state: 'APPLIED',
          refTransactionId: original.id,
        });
        await txnRepo.save(reversal);

        original.state = 'REVERSED';
        await txnRepo.save(original);

        profile.rating = original.ratingBefore;
        profile.ratedMatches = Math.max(0, profile.ratedMatches - 1);
        profile.ratingDeviation = Math.min(350, profile.ratingDeviation + 20);
      }

      const remaining = await mpRepo.find({ where: { userId } });
      let lastRankedAt: Date | null = null;
      const opponents = new Set<string>();
      for (const mp of remaining) {
        if (mp.matchId === matchId) continue;
        const match = await matchRepo.findOne({ where: { id: mp.matchId } });
        if (!match || match.status !== 'RATED') continue;
        if (match.ratedAt && (!lastRankedAt || match.ratedAt > lastRankedAt)) {
          lastRankedAt = match.ratedAt;
        }
        const mates = await mpRepo.find({ where: { matchId: mp.matchId } });
        for (const m of mates) {
          if (m.userId !== userId) opponents.add(m.userId);
        }
      }
      profile.uniqueOpponents = opponents.size;
      profile.lastRankedAt = lastRankedAt;
      profile.ratingState =
        profile.ratedMatches >= (await this.eloConfig.getFor<number>(em, 'provisional_matches'))
          ? 'ESTABLISHED'
          : 'PROVISIONAL';
      await profileRepo.save(profile);
    }
  }
}
