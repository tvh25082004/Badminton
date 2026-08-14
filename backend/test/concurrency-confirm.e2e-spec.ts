/**
 * AC-7: Hai request confirm đồng thời không được tạo hai RatingTransaction.
 * Mô phỏng 100 request confirm đồng thời (4 player × 25) → chỉ 1 match RATED
 * và đúng 4 RatingTransaction APPLIED.
 *
 * Yêu cầu: PostgreSQL đang chạy (docker compose up -d).
 *
 * Lưu ý: dùng .agent(false) — superagent mặc định pool connection (keep-alive)
 * chống server in-process của supertest làm reset socket (ECONNRESET) khi
 * bắn nhiều request đồng thời trên Node 24.
 */
import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { EnvService } from '../src/common/config/env.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { User } from '../src/modules/auth/entities/user.entity';
import { RatingProfile } from '../src/modules/ratings/entities/rating-profile.entity';
import { Match } from '../src/modules/matches/entities/match.entity';
import { MatchPlayer } from '../src/modules/matches/entities/match-player.entity';
import { MatchResult } from '../src/modules/matches/entities/match-result.entity';
import { ResultConfirmation } from '../src/modules/matches/entities/result-confirmation.entity';
import { RatingTransaction } from '../src/modules/ratings/entities/rating-transaction.entity';

describe('Concurrent confirm (AC-7)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let env: EnvService;
  let baseUrl: string;

  const phones = ['0902000001', '0902000002', '0902000003', '0902000004'];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // main.ts set global prefix "api/v1" — e2e app phải mirror để route khớp.
    app.setGlobalPrefix('api/v1');
    await app.init();
    app.useGlobalFilters(new AllExceptionsFilter());
    // Listen trên port thật: superagent pool connection (keep-alive) chống server
    // in-process của supertest làm reset socket (ECONNRESET) khi bắn 100 request đồng thời.
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    env = app.get(EnvService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('100 concurrent confirms → exactly 1 match RATED + 4 RatingTransactions', async () => {
    const userRepo = ds.getRepository(User);
    const profileRepo = ds.getRepository(RatingProfile);
    const matchRepo = ds.getRepository(Match);
    const mpRepo = ds.getRepository(MatchPlayer);
    const resultRepo = ds.getRepository(MatchResult);
    const txnRepo = ds.getRepository(RatingTransaction);
    const confRepo = ds.getRepository(ResultConfirmation);

    // Dọn data test còn sót từ lần chạy trước (test phải idempotent).
    const staleUsers = await userRepo.find({ where: phones.map((p) => ({ phone: p })) });
    for (const u of staleUsers) {
      await profileRepo.delete({ userId: u.id });
      await txnRepo.delete({ userId: u.id });
      await userRepo.delete({ id: u.id });
    }

    const userIds: string[] = [];
    for (const phone of phones) {
      const u = await userRepo.save(userRepo.create({ phone, role: 'PLAYER', status: 'ACTIVE' }));
      userIds.push(u.id);
      await profileRepo.save(
        profileRepo.create({
          userId: u.id,
          type: 'DOUBLES',
          rating: 1200,
          ratingDeviation: 300,
          ratingState: 'PROVISIONAL',
          ratedMatches: 2,
          uniqueOpponents: 1,
          algorithmVersion: 'elo.doubles.v1',
        }),
      );
    }

    // Match đã có kết quả PENDING và đang chờ confirm (PENDING_CONFIRM).
    const match = await matchRepo.save(
      matchRepo.create({
        creatorId: userIds[0],
        matchType: 'SCHEDULED',
        mode: 'RATED',
        format: 'BEST_OF_3',
        status: 'PENDING_CONFIRM',
      }),
    );
    await mpRepo.save(
      userIds.map((uid, i) =>
        mpRepo.create({ matchId: match.id, userId: uid, team: i < 2 ? 'A' : 'B', rosterConfirmed: true }),
      ),
    );
    const result = await resultRepo.save(
      resultRepo.create({
        matchId: match.id,
        submittedById: userIds[0],
        scores: { teamA: [21], teamB: [19] },
        status: 'PENDING',
      }),
    );

    const token = (uid: string) =>
      jwt.sign({ sub: uid, phone: 'x', role: 'PLAYER' }, { secret: env.jwtAccessSecret, expiresIn: '15m' });

    const confirm = (uid: string) =>
      request(baseUrl)
        .post(`/api/v1/matches/${match.id}/confirm`)
        .set('Authorization', `Bearer ${token(uid)}`)
        .send({ decision: 'CONFIRM', resultId: result.id })
        .expect(201);

    // 100 request đồng thời: 4 player × 25.
    const requests: Promise<unknown>[] = [];
    for (const uid of userIds) {
      for (let i = 0; i < 25; i++) {
        requests.push(confirm(uid));
      }
    }
    await Promise.all(requests);

    const after = await matchRepo.findOne({ where: { id: match.id } });
    const txns = await txnRepo.find({ where: { matchId: match.id } });
    const applied = txns.filter((t) => t.state === 'APPLIED');

    expect(after?.status).toBe('RATED');
    expect(applied).toHaveLength(4);
    expect(txns).toHaveLength(4); // không có transaction lặp

    // Dọn dẹp dữ liệu test.
    await txnRepo.delete({ matchId: match.id });
    await confRepo.delete({ matchResultId: result.id });
    await resultRepo.delete({ id: result.id });
    await mpRepo.delete({ matchId: match.id });
    await matchRepo.delete({ id: match.id });
    for (const uid of userIds) {
      await profileRepo.delete({ userId: uid });
      await userRepo.delete({ id: uid });
    }
  }, 120000);
});
