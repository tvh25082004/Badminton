import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EloConfig } from '../../modules/ratings/entities/elo-config.entity';

type ConfigColumn = Exclude<
  keyof EloConfig,
  'id' | 'createdAt' | 'updatedAt' | 'updatedBy'
>;

/**
 * Cấu hình Elo — nguồn sự thật là bảng elo_configs (single row, admin có thể chỉnh).
 * API key-based để các service gọi quen thuộc; ánh xạ sang column thực tế.
 */
@Injectable()
export class EloConfigService {
  constructor(
    @InjectRepository(EloConfig) private readonly repo: Repository<EloConfig>,
  ) {}

  private readonly COLUMN_MAP: Record<string, ConfigColumn> = {
    base_rating: 'baseRating',
    rating_floor: 'floor',
    rating_ceiling: 'ceiling',
    provisional_matches: 'provisionalMatches',
    deviation_start: 'initialDeviation',
    deviation_step: 'deviationStep',
    deviation_floor: 'deviationFloor',
    leaderboard_min_rated_matches: 'leaderboardMinMatches',
    leaderboard_min_unique_opponents: 'leaderboardMinOpponents',
  };

  private rowCache: EloConfig | null = null;

  private async row(): Promise<EloConfig> {
    if (this.rowCache) return this.rowCache;
    let row = await this.repo.findOne({ where: { id: 1 } });
    if (!row) {
      row = this.repo.create({ id: 1 });
      row = await this.repo.save(row);
    }
    this.rowCache = row;
    return row;
  }

  invalidate(): void {
    this.rowCache = null;
  }

  /**
   * Đọc config qua EntityManager truyền vào (dùng BÊN TRONG transaction).
   * Không cache, không dùng main pool — tránh pool starvation khi transaction
   * đang giữ pessimistic lock mà pool bị các transaction chờ lock chiếm hết.
   */
  async getFor<T>(em: EntityManager, key: string): Promise<T> {
    const repo = em.getRepository(EloConfig);
    let row = await repo.findOne({ where: { id: 1 } });
    if (!row) {
      row = repo.create({ id: 1 });
      row = await repo.save(row);
    }
    const column = this.COLUMN_MAP[key];
    if (column) return (row[column] as unknown) as T;
    if (key === 'k_factor') {
      const entries: Record<string, number> = {};
      for (const e of row.kFactorTable) entries[`${e.minMatches}+`] = e.k;
      return entries as unknown as T;
    }
    if (key === 'format_weight') return row.formatWeights as unknown as T;
    if (key === 'repeated_opponent_weight') {
      const entries: Record<string, number> = {};
      for (const w of row.repeatedOpponentWeights) entries[String(w.meetings)] = w.weight;
      return entries as unknown as T;
    }
    throw new Error(`Unknown elo config key: ${key}`);
  }

  async get<T>(key: string): Promise<T> {
    const row = await this.row();
    const column = this.COLUMN_MAP[key];
    if (column) return (row[column] as unknown) as T;
    // K-factor / format weight / repeated weight — query dạng bảng.
    if (key === 'k_factor') return this.kFactorTable() as unknown as T;
    if (key === 'format_weight') return row.formatWeights as unknown as T;
    if (key === 'repeated_opponent_weight') {
      const entries: Record<string, number> = {};
      for (const w of row.repeatedOpponentWeights) {
        entries[String(w.meetings)] = w.weight;
      }
      return entries as unknown as T;
    }
    throw new Error(`Unknown elo config key: ${key}`);
  }

  async kFactorFor(ratedMatches: number): Promise<number> {
    const row = await this.row();
    let k = 24;
    for (const entry of row.kFactorTable) {
      if (ratedMatches >= entry.minMatches) k = entry.k;
    }
    return k;
  }

  private async kFactorTable(): Promise<Record<string, number>> {
    const row = await this.row();
    const entries: Record<string, number> = {};
    for (const e of row.kFactorTable) {
      entries[`${e.minMatches}+`] = e.k;
    }
    return entries;
  }

  /** Toàn bộ config dạng key→value để admin xem. */
  async all(): Promise<Record<string, unknown>> {
    const row = await this.row();
    const out: Record<string, unknown> = {
      base_rating: row.baseRating,
      rating_floor: row.floor,
      rating_ceiling: row.ceiling,
      provisional_matches: row.provisionalMatches,
      leaderboard_min_rated_matches: row.leaderboardMinMatches,
      leaderboard_min_unique_opponents: row.leaderboardMinOpponents,
      deviation_start: row.initialDeviation,
      deviation_step: row.deviationStep,
      deviation_floor: row.deviationFloor,
      k_factor: await this.kFactorTable(),
      format_weight: row.formatWeights,
      repeated_opponent_weight: await this.get<Record<string, number>>(
        'repeated_opponent_weight',
      ),
    };
    return out;
  }

  async set(key: string, value: unknown, updatedBy?: string | null): Promise<void> {
    const row = await this.row();
    const column = this.COLUMN_MAP[key];
    if (column) {
      (row as unknown as Record<string, unknown>)[column] = value;
    } else if (key === 'k_factor') {
      const table = value as Array<{ minMatches: number; k: number }>;
      row.kFactorTable = table;
    } else if (key === 'format_weight') {
      row.formatWeights = (value as Record<string, number>) ?? {};
    } else if (key === 'repeated_opponent_weight') {
      const map = value as Record<string, number>;
      row.repeatedOpponentWeights = Object.entries(map).map(([meetings, weight]) => ({
        meetings: Number(meetings),
        weight,
      }));
    } else {
      throw new Error(`Unknown elo config key: ${key}`);
    }
    row.updatedBy = updatedBy ?? null;
    await this.repo.save(row);
    this.invalidate();
  }
}
