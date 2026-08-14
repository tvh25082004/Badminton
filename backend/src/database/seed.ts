/* eslint-disable no-console */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../modules/auth/entities/user.entity';
import { RefreshSession } from '../modules/auth/entities/refresh-session.entity';
import { PlayerProfile } from '../modules/players/entities/player-profile.entity';
import { SelfAssessment } from '../modules/ratings/entities/self-assessment.entity';
import { RatingProfile } from '../modules/ratings/entities/rating-profile.entity';
import { RatingTransaction } from '../modules/ratings/entities/rating-transaction.entity';
import { EloConfig } from '../modules/ratings/entities/elo-config.entity';
import { Venue } from '../modules/venues/entities/venue.entity';
import { Session } from '../modules/sessions/entities/session.entity';
import { SessionParticipant } from '../modules/sessions/entities/session-participant.entity';
import { Match } from '../modules/matches/entities/match.entity';
import { MatchPlayer } from '../modules/matches/entities/match-player.entity';
import { MatchResult } from '../modules/matches/entities/match-result.entity';
import { Dispute } from '../modules/matches/entities/dispute.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';
import { Band } from '../domain/assessment/self-assessment';

dotenv.config({ path: '.env' });

const seedMatchId = (n: number) =>
  `11111111-1111-1111-1111-11111111${String(n).padStart(4, '0')}`;

interface SeedPlayer {
  phone: string;
  name: string;
  region: string;
  rating: number;
  deviation: number;
  ratedMatches: number;
  uniqueOpponents: number;
  baseRating: number;
  band: string;
  selfLevel: string;
  gender?: string;
  handedness?: string;
  position?: string;
}

const PLAYERS: SeedPlayer[] = [
  { phone: '0901000001', name: 'Minh Quân', region: 'Quận 7, TP.HCM', rating: 1542, deviation: 62, ratedMatches: 24, uniqueOpponents: 11, baseRating: 1400, band: 'ADVANCED', selfLevel: 'ADVANCED', gender: 'male', handedness: 'right', position: 'front' },
  { phone: '0901000002', name: 'Thu Hà', region: 'Quận 7, TP.HCM', rating: 1488, deviation: 70, ratedMatches: 18, uniqueOpponents: 9, baseRating: 1400, band: 'ADVANCED', selfLevel: 'ADVANCED', gender: 'female', handedness: 'right', position: 'front' },
  { phone: '0901000003', name: 'Đức Anh', region: 'Quận 7, TP.HCM', rating: 1455, deviation: 74, ratedMatches: 16, uniqueOpponents: 8, baseRating: 1300, band: 'INTERMEDIATE_PLUS', selfLevel: 'INTERMEDIATE_PLUS', gender: 'male', handedness: 'right', position: 'back' },
  { phone: '0901000004', name: 'Lan Phương', region: 'Quận 7, TP.HCM', rating: 1390, deviation: 82, ratedMatches: 13, uniqueOpponents: 7, baseRating: 1300, band: 'INTERMEDIATE_PLUS', selfLevel: 'INTERMEDIATE_PLUS', gender: 'female', handedness: 'left', position: 'front' },
  { phone: '0901000005', name: 'Hoàng Nam', region: 'Cầu Giấy, Hà Nội', rating: 1610, deviation: 56, ratedMatches: 31, uniqueOpponents: 14, baseRating: 1500, band: 'COMPETITIVE', selfLevel: 'COMPETITIVE', gender: 'male', handedness: 'right', position: 'back' },
  { phone: '0901000006', name: 'Ngọc Trâm', region: 'Cầu Giấy, Hà Nội', rating: 1520, deviation: 66, ratedMatches: 22, uniqueOpponents: 10, baseRating: 1400, band: 'ADVANCED', selfLevel: 'ADVANCED', gender: 'female', handedness: 'right', position: 'front' },
  { phone: '0901000007', name: 'Văn Hùng', region: 'Cầu Giấy, Hà Nội', rating: 1365, deviation: 90, ratedMatches: 12, uniqueOpponents: 6, baseRating: 1200, band: 'INTERMEDIATE', selfLevel: 'INTERMEDIATE', gender: 'male', handedness: 'right', position: 'back' },
  { phone: '0901000008', name: 'Kim Oanh', region: 'Cầu Giấy, Hà Nội', rating: 1330, deviation: 95, ratedMatches: 11, uniqueOpponents: 7, baseRating: 1200, band: 'INTERMEDIATE', selfLevel: 'INTERMEDIATE', gender: 'female', handedness: 'left', position: 'front' },
  { phone: '0901000009', name: 'Gia Bảo', region: 'Đống Đa, Hà Nội', rating: 1280, deviation: 105, ratedMatches: 10, uniqueOpponents: 6, baseRating: 1050, band: 'BEGINNER', selfLevel: 'BEGINNER', gender: 'male', handedness: 'right', position: 'back' },
  { phone: '0901000010', name: 'Mai Chi', region: 'Đống Đa, Hà Nội', rating: 1245, deviation: 110, ratedMatches: 10, uniqueOpponents: 6, baseRating: 1200, band: 'INTERMEDIATE', selfLevel: 'INTERMEDIATE', gender: 'female', handedness: 'right', position: 'front' },
  { phone: '0901000011', name: 'Thanh Tú', region: 'Đống Đa, Hà Nội', rating: 1210, deviation: 130, ratedMatches: 9, uniqueOpponents: 5, baseRating: 1050, band: 'BEGINNER', selfLevel: 'BEGINNER', gender: 'female', handedness: 'right', position: 'back' },
  { phone: '0901000012', name: 'Phúc Thịnh', region: 'Thủ Đức, TP.HCM', rating: 1440, deviation: 78, ratedMatches: 15, uniqueOpponents: 8, baseRating: 1300, band: 'INTERMEDIATE_PLUS', selfLevel: 'INTERMEDIATE_PLUS', gender: 'male', handedness: 'left', position: 'back' },
  { phone: '0901000013', name: 'Bích Ngọc', region: 'Thủ Đức, TP.HCM', rating: 1180, deviation: 150, ratedMatches: 6, uniqueOpponents: 4, baseRating: 1050, band: 'BEGINNER', selfLevel: 'BEGINNER', gender: 'female', handedness: 'right', position: 'front' },
];

const ADMIN_PHONE = '0900000000';
const MOD_PHONE = '0900000001';

function answersFor(p: SeedPlayer): Record<string, string> {
  return {
    experience_years: 'Y3_TO_5Y',
    weekly_frequency: 'TWO_TO_THREE',
    clear_skill: 'CONSISTENT',
    smash_skill: 'CONSISTENT',
    net_skill: 'CONSISTENT',
    defense_skill: 'CONSISTENT',
    footwork_skill: 'CONSISTENT',
    doubles_rotation: 'CONSISTENT',
    competition_experience: 'RECREATIONAL_TOURNAMENT',
    self_level: p.selfLevel,
  };
}

async function run() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USER || 'badminton',
    password: process.env.DB_PASSWORD || 'badminton_dev',
    database: process.env.DB_NAME || 'badminton',
    entities: [
      User, PlayerProfile, SelfAssessment, RatingProfile, RatingTransaction, EloConfig,
      Venue, Session, SessionParticipant, Match, MatchPlayer, MatchResult, Dispute,
      Notification, AuditLog, RefreshSession,
    ],
    synchronize: true,
    logging: false,
  });
  await ds.initialize();
  console.log('✔ Connected to PostgreSQL');

  // Xoá theo thứ tự FK (delete an toàn hơn TRUNCATE khi có khóa ngoại)
  for (const repo of [
    ds.getRepository(AuditLog),
    ds.getRepository(Notification),
    ds.getRepository(Dispute),
    ds.getRepository(MatchResult),
    ds.getRepository(MatchPlayer),
    ds.getRepository(Match),
    ds.getRepository(SessionParticipant),
    ds.getRepository(Session),
    ds.getRepository(RatingTransaction),
    ds.getRepository(RatingProfile),
    ds.getRepository(SelfAssessment),
    ds.getRepository(PlayerProfile),
    ds.getRepository(Venue),
    ds.getRepository(RefreshSession),
    ds.getRepository(User),
  ]) {
    await repo.createQueryBuilder().delete().execute();
  }
  console.log('✔ Cleared seed tables');

  const admin = await ds.getRepository(User).save(
    ds.getRepository(User).create({ phone: ADMIN_PHONE, role: 'ADMIN', status: 'ACTIVE' }),
  );
  const mod = await ds.getRepository(User).save(
    ds.getRepository(User).create({ phone: MOD_PHONE, role: 'MODERATOR', status: 'ACTIVE' }),
  );
  console.log(`✔ Admin ${ADMIN_PHONE} (id=${admin.id}), Moderator ${MOD_PHONE} (id=${mod.id})`);

  const userIds: Record<string, string> = {};
  for (const p of PLAYERS) {
    const user = await ds.getRepository(User).save(
      ds.getRepository(User).create({ phone: p.phone, role: 'PLAYER', status: 'ACTIVE', displayName: p.name }),
    );
    userIds[p.phone] = user.id;

    await ds.getRepository(PlayerProfile).save(
      ds.getRepository(PlayerProfile).create({
        userId: user.id,
        displayName: p.name,
        region: p.region,
        gender: p.gender ?? null,
        handedness: p.handedness ?? null,
        preferredPosition: p.position ?? null,
      }),
    );

    const answersArr = Object.entries(answersFor(p)).map(([questionId, value]) => ({
      questionId,
      value,
    }));
    await ds.getRepository(SelfAssessment).save(
      ds.getRepository(SelfAssessment).create({
        userId: user.id,
        schemaVersion: '2026.08.2',
        answers: answersArr,
        totalScore: 16,
        band: p.band as Band,
        rating: p.baseRating,
      }),
    );

    await ds.getRepository(RatingProfile).save(
      ds.getRepository(RatingProfile).create({
        userId: user.id,
        type: 'DOUBLES',
        rating: p.rating,
        ratingDeviation: p.deviation,
        ratingState: p.ratedMatches >= 10 ? 'ESTABLISHED' : 'PROVISIONAL',
        ratedMatches: p.ratedMatches,
        uniqueOpponents: p.uniqueOpponents,
        lastRankedAt: new Date(Date.now() - 86400000),
        algorithmVersion: 'elo.doubles.v1',
      }),
    );

    // Lịch sử: INITIAL + vài MATCH_RESULT đi dần tới rating hiện tại.
    const txnRepo = ds.getRepository(RatingTransaction);
    await txnRepo.save(
      txnRepo.create({
        userId: user.id,
        matchId: null,
        type: 'INITIAL',
        ratingBefore: p.baseRating,
        delta: 0,
        ratingAfter: p.baseRating,
        algorithmVersion: 'elo.doubles.v1',
        state: 'APPLIED',
      }),
    );
    const steps = Math.min(5, Math.max(2, p.ratedMatches));
    let current = p.baseRating;
    for (let i = 0; i < steps; i++) {
      const remaining = p.rating - current;
      const delta = Math.round(remaining / (steps - i));
      const before = current;
      current += delta;
      await txnRepo.save(
        txnRepo.create({
          userId: user.id,
          matchId: seedMatchId(i),
          type: 'MATCH_RESULT',
          ratingBefore: before,
          delta,
          ratingAfter: current,
          algorithmVersion: 'elo.doubles.v1',
          state: 'APPLIED',
        }),
      );
    }
  }
  console.log(`✔ ${PLAYERS.length} players seeded`);

  const venues = [
    { name: 'Sân cầu lông Phú Thọ', address: '02 Lê Thánh Tôn, Quận 7', region: 'Quận 7, TP.HCM', courts: 6, feePerCourt: 180000 },
    { name: 'Cầu lông Galaxy 7', address: '78 Nguyễn Hữu Thọ, Quận 7', region: 'Quận 7, TP.HCM', courts: 4, feePerCourt: 160000 },
    { name: 'Nhà thi đấu Cầu Giấy', address: '1 Trần Vỹ, Cầu Giấy', region: 'Cầu Giấy, Hà Nội', courts: 8, feePerCourt: 200000 },
    { name: 'Sân Việt Hùng', address: '12 Hoàng Quốc Việt, Cầu Giấy', region: 'Cầu Giấy, Hà Nội', courts: 5, feePerCourt: 150000 },
    { name: 'Cầu lông Thăng Long', address: '45 Láng Hạ, Đống Đa', region: 'Đống Đa, Hà Nội', courts: 3, feePerCourt: 170000 },
    { name: 'Sân Linh Trung', address: '88 Quốc lộ 1K, Thủ Đức', region: 'Thủ Đức, TP.HCM', courts: 6, feePerCourt: 140000 },
  ];
  const venueIds: string[] = [];
  for (const v of venues) {
    const saved = await ds.getRepository(Venue).save(
      ds.getRepository(Venue).create({
        name: v.name,
        address: v.address,
        region: v.region,
        courtCount: v.courts,
        isActive: true,
      }),
    );
    venueIds.push(saved.id);
  }
  console.log(`✔ ${venues.length} venues seeded`);

  const sessionRepo = ds.getRepository(Session);
  const partRepo = ds.getRepository(SessionParticipant);
  const now = Date.now();
  const in2d = new Date(now + 2 * 86400000);
  const in5d = new Date(now + 5 * 86400000);
  const in1d = new Date(now + 1 * 86400000);

  const sessionDefs: Array<{
    hostId: string;
    venueId: string | null;
    title: string;
    startAt: Date;
    endAt: Date;
    maxParticipants: number;
    format: 'RECREATIONAL' | 'PRACTICE' | 'RATED';
    totalCost: number;
    costBreakdown: Record<string, number>;
  }> = [
    {
      hostId: userIds[PLAYERS[0].phone], venueId: venueIds[0], title: 'Giao lưu tối thứ 4 — Q7',
      startAt: in2d, endAt: new Date(in2d.getTime() + 2 * 3600000), maxParticipants: 8, format: 'RECREATIONAL',
      totalCost: 240000, costBreakdown: { 'Thuê sân 2h': 180000, 'Cầu': 60000 },
    },
    {
      hostId: userIds[PLAYERS[4].phone], venueId: venueIds[2], title: 'Đánh rated tối thứ 6 — Cầu Giấy',
      startAt: in5d, endAt: new Date(in5d.getTime() + 3 * 3600000), maxParticipants: 8, format: 'RATED',
      totalCost: 380000, costBreakdown: { 'Thuê sân 3h': 300000, 'Cầu': 80000 },
    },
    {
      hostId: userIds[PLAYERS[11].phone], venueId: venueIds[5], title: 'Luyện tập sáng CN — Thủ Đức',
      startAt: in1d, endAt: new Date(in1d.getTime() + 2 * 3600000), maxParticipants: 6, format: 'PRACTICE',
      totalCost: 140000, costBreakdown: { 'Thuê sân 2h': 140000 },
    },
  ];
  for (const def of sessionDefs) {
    const s = await sessionRepo.save(
      sessionRepo.create({
        hostId: def.hostId,
        venueId: def.venueId,
        title: def.title,
        startAt: def.startAt,
        endAt: def.endAt,
        courtCount: 1,
        minParticipants: 4,
        maxParticipants: def.maxParticipants,
        format: def.format,
        totalCost: def.totalCost,
        costSplitMode: 'EQUAL',
        costBreakdown: def.costBreakdown,
        status: 'OPEN',
      }),
    );
    const joined = [def.hostId, ...Object.values(userIds).filter((id) => id !== def.hostId).slice(0, 3)];
    for (const uid of joined) {
      await partRepo.save(partRepo.create({ sessionId: s.id, userId: uid, status: 'JOINED' }));
    }
    s.status = joined.length >= def.maxParticipants ? 'FULL' : 'OPEN';
    await sessionRepo.save(s);
  }
  console.log(`✔ ${sessionDefs.length} sessions seeded`);

  const matchRepo = ds.getRepository(Match);
  const mpRepo = ds.getRepository(MatchPlayer);
  const resultRepo = ds.getRepository(MatchResult);

  // 1) Match PENDING_CONFIRM (chờ confirm)
  const m1 = await matchRepo.save(
    matchRepo.create({
      creatorId: userIds[PLAYERS[0].phone], matchType: 'SCHEDULED', mode: 'RATED', format: 'BEST_OF_3',
      status: 'PENDING_CONFIRM', scheduledAt: new Date(now - 2 * 3600000),
    }),
  );
  await mpRepo.save([
    mpRepo.create({ matchId: m1.id, userId: userIds[PLAYERS[0].phone], team: 'A', rosterConfirmed: true }),
    mpRepo.create({ matchId: m1.id, userId: userIds[PLAYERS[1].phone], team: 'A', rosterConfirmed: true }),
    mpRepo.create({ matchId: m1.id, userId: userIds[PLAYERS[2].phone], team: 'B', rosterConfirmed: true }),
    mpRepo.create({ matchId: m1.id, userId: userIds[PLAYERS[3].phone], team: 'B', rosterConfirmed: true }),
  ]);
  await resultRepo.save(
    resultRepo.create({
      matchId: m1.id, submittedById: userIds[PLAYERS[0].phone],
      scores: { teamA: [21], teamB: [16] }, status: 'PENDING',
    }),
  );

  // 2) Match DISPUTED (admin demo)
  const m2 = await matchRepo.save(
    matchRepo.create({
      creatorId: userIds[PLAYERS[4].phone], matchType: 'SCHEDULED', mode: 'RATED', format: 'BEST_OF_3',
      status: 'DISPUTED', scheduledAt: new Date(now - 3 * 3600000),
    }),
  );
  const m2players = [PLAYERS[4], PLAYERS[5], PLAYERS[6], PLAYERS[7]];
  await mpRepo.save(
    m2players.map((p, i) =>
      mpRepo.create({ matchId: m2.id, userId: userIds[p.phone], team: i < 2 ? 'A' : 'B', rosterConfirmed: true }),
    ),
  );
  await resultRepo.save(
    resultRepo.create({
      matchId: m2.id, submittedById: userIds[m2players[0].phone],
      scores: { teamA: [21], teamB: [19] }, status: 'PENDING',
    }),
  );
  await ds.getRepository(Dispute).save(
    ds.getRepository(Dispute).create({
      matchId: m2.id, openedByUserId: userIds[m2players[2].phone],
      reason: 'Tỷ số không khớp, bên em thắng 21-17', status: 'OPEN', evidenceUrls: [],
    }),
  );

  // 3) Quick match demo (DRAFT, chờ 3 người join)
  const m3 = await matchRepo.save(
    matchRepo.create({
      creatorId: userIds[PLAYERS[8].phone], matchType: 'QUICK', mode: 'RATED', format: 'BEST_OF_3',
      status: 'DRAFT', quickInviteExpiresAt: new Date(now + 5 * 60000),
    }),
  );
  await mpRepo.save(
    mpRepo.create({
      matchId: m3.id, userId: userIds[PLAYERS[8].phone], team: 'A', rosterConfirmed: true,
      deviceId: 'demo-device-creator', qrWindow: String(Math.floor(now / 1000)),
    }),
  );

  // 4-7) Vài trận RATED
  const ratedDefs: Array<{ p: SeedPlayer[]; scores: [number, number] }> = [
    { p: [PLAYERS[0], PLAYERS[1], PLAYERS[2], PLAYERS[3]], scores: [21, 15] },
    { p: [PLAYERS[4], PLAYERS[5], PLAYERS[6], PLAYERS[7]], scores: [21, 18] },
    { p: [PLAYERS[0], PLAYERS[4], PLAYERS[11], PLAYERS[5]], scores: [17, 21] },
    { p: [PLAYERS[1], PLAYERS[2], PLAYERS[6], PLAYERS[7]], scores: [21, 20] },
  ];
  for (let idx = 0; idx < ratedDefs.length; idx++) {
    const def = ratedDefs[idx];
    const t = new Date(now - (5 + idx) * 86400000);
    const m = await matchRepo.save(
      matchRepo.create({
        creatorId: userIds[def.p[0].phone], matchType: 'SCHEDULED', mode: 'RATED', format: 'BEST_OF_3',
        status: 'RATED', scheduledAt: t, ratedAt: new Date(t.getTime() + 7200000),
      }),
    );
    await mpRepo.save(
      def.p.map((p, i) =>
        mpRepo.create({ matchId: m.id, userId: userIds[p.phone], team: i < 2 ? 'A' : 'B', rosterConfirmed: true }),
      ),
    );
    await resultRepo.save(
      resultRepo.create({
        matchId: m.id, submittedById: userIds[def.p[0].phone],
        scores: { teamA: [def.scores[0]], teamB: [def.scores[1]] }, status: 'CONFIRMED',
      }),
    );
  }
  console.log(`✔ 4 rated matches + demo states seeded`);

  console.log('\n=== SEED COMPLETE ===');
  console.log(`Admin login:     ${ADMIN_PHONE} (OTP trả trong response — SMS_MOCK=true)`);
  console.log(`Moderator login: ${MOD_PHONE}`);
  console.log(`Player demo:     ${PLAYERS[0].phone} (Minh Quân, rating ${PLAYERS[0].rating})`);
  console.log(`Swagger: http://localhost:${process.env.PORT || 4000}/api/docs`);
  await ds.destroy();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
