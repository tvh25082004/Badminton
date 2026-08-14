import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Match } from './entities/match.entity';
import { MatchPlayer } from './entities/match-player.entity';
import { User } from '../auth/entities/user.entity';
import { Dispute } from './entities/dispute.entity';

export interface AntiFraudResult {
  flagged: boolean;
  reasons: string[];
}

/**
 * Tín hiệu anti-fraud tối thiểu (Requirement §12.3).
 * Không tự kết luận gian lận; chỉ chuyển Match sang PENDING_REVIEW và không cộng Elo.
 *
 * Mọi query chạy trên `em` truyền vào (transaction) — KHÔNG dùng main pool.
 * Trong confirmResult, transaction giữ pessimistic lock trên Match; nếu ở đây
 * lại lấy connection từ pool (đang bị các transaction chờ lock chiếm hết) sẽ
 * dẫn tới pool starvation → "timeout exceeded when trying to connect".
 */
@Injectable()
export class AntiFraudService {
  private static readonly MAX_RATED_PER_24H = 6;
  private static readonly NEW_ACCOUNT_DAYS = 7;

  async evaluate(
    em: EntityManager,
    match: Match,
    playerIds: string[],
    previousMeetingsWithin7d: number,
  ): Promise<AntiFraudResult> {
    const matches = em.getRepository(Match);
    const matchPlayers = em.getRepository(MatchPlayer);
    const users = em.getRepository(User);
    const disputes = em.getRepository(Dispute);

    const reasons: string[] = [];

    // 1. Tần suất lặp lại đối đầu bất thường (≥4 lần trong 7 ngày).
    if (previousMeetingsWithin7d >= 4) {
      reasons.push(`repeated matchups: ${previousMeetingsWithin7d} meetings in 7 days`);
    }

    // 2. Nhiều trận rated trong khoảng thời gian phi thực tế.
    for (const pid of playerIds) {
      const count = await matches
        .createQueryBuilder('m')
        .innerJoin(MatchPlayer, 'mp', 'mp.matchId = m.id AND mp.userId = :pid', { pid })
        .where('m.status = :status', { status: 'RATED' })
        .andWhere('m.ratedAt >= NOW() - interval \'24 hours\'')
        .getCount();
      if (count >= AntiFraudService.MAX_RATED_PER_24H) {
        reasons.push(`player ${pid}: ${count} rated matches in 24h`);
        break;
      }
    }

    // 3. Nhiều tài khoản mới chỉ chơi với nhau.
    const userList = await users
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: playerIds })
      .getMany();
    const newAccounts = userList.filter(
      (u) =>
        u.createdAt.getTime() >
        Date.now() - AntiFraudService.NEW_ACCOUNT_DAYS * 86400000,
    );
    if (newAccounts.length >= 3) {
      const histories = await Promise.all(
        newAccounts.map(async (u) => {
          const mps = await matchPlayers.find({ where: { userId: u.id } });
          return mps.map((m) => m.matchId);
        }),
      );
      const allMatches = new Set<string>();
      for (const h of histories) for (const mid of h) allMatches.add(mid);
      let onlyPlayedEachOther = true;
      for (const mid of allMatches) {
        const players = await matchPlayers.find({ where: { matchId: mid } });
        const ids = players.map((p) => p.userId);
        if (ids.some((id) => !playerIds.includes(id))) {
          onlyPlayedEachOther = false;
          break;
        }
      }
      if (allMatches.size >= 2 && onlyPlayedEachOther) {
        reasons.push('multiple new accounts playing only each other');
      }
    }

    // 4. Lịch sử dispute cao.
    for (const pid of playerIds) {
      const disputeCount = await disputes.count({ where: { openedByUserId: pid } });
      if (disputeCount >= 3) {
        reasons.push(`player ${pid}: ${disputeCount} opened disputes`);
        break;
      }
    }

    return { flagged: reasons.length > 0, reasons };
  }

  /** Đếm số lần gặp trước đó trong 7 ngày — max của 4 cặp chéo (Requirement §11.2). */
  async countPriorMeetings(
    em: EntityManager,
    matchId: string,
    playerIds: string[],
    now: Date,
  ): Promise<number> {
    const matches = em.getRepository(Match);
    const pairs: Array<[string, string]> = [
      [playerIds[0], playerIds[2]],
      [playerIds[0], playerIds[3]],
      [playerIds[1], playerIds[2]],
      [playerIds[1], playerIds[3]],
    ];
    const cutoff = new Date(now.getTime() - 7 * 86400000);
    let maxCount = 0;
    for (const [x, y] of pairs) {
      const count = await matches
        .createQueryBuilder('m')
        .innerJoin(MatchPlayer, 'mp1', 'mp1.matchId = m.id AND mp1.userId = :x', { x })
        .innerJoin(MatchPlayer, 'mp2', 'mp2.matchId = m.id AND mp2.userId = :y', { y })
        .where('m.status = :status', { status: 'RATED' })
        .andWhere('m.id != :matchId', { matchId })
        .andWhere('m.ratedAt >= :cutoff', { cutoff })
        .getCount();
      if (count > maxCount) maxCount = count;
    }
    return maxCount;
  }
}
