import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerProfile } from './entities/player-profile.entity';
import { RatingProfile } from '../ratings/entities/rating-profile.entity';
import { RatingTransaction } from '../ratings/entities/rating-transaction.entity';
import { QUESTIONS, RUBRIC_SCHEMA_VERSION } from '../../domain/assessment/self-assessment';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(PlayerProfile)
    private readonly profiles: Repository<PlayerProfile>,
    @InjectRepository(RatingProfile)
    private readonly ratings: Repository<RatingProfile>,
    @InjectRepository(RatingTransaction)
    private readonly txns: Repository<RatingTransaction>,
  ) {}

  /**
   * Rubric public — không expose điểm/band/rating (Requirement §6.1, §6.2.6).
   */
  rubric() {
    return {
      schemaVersion: RUBRIC_SCHEMA_VERSION,
      questions: QUESTIONS.map((q) => ({
        id: q.id,
        scored: q.scored,
        validValues: q.validValues,
      })),
    };
  }

  async profileOf(userId: string): Promise<PlayerProfile | null> {
    return this.profiles.findOne({ where: { userId } });
  }

  async createProfile(userId: string, data: Partial<PlayerProfile>): Promise<PlayerProfile> {
    return this.profiles.save(this.profiles.create({ userId, ...data }));
  }

  async updateProfile(userId: string, data: Partial<PlayerProfile>): Promise<PlayerProfile> {
    const profile = await this.profileOf(userId);
    if (!profile) return this.createProfile(userId, data);
    Object.assign(profile, data);
    return this.profiles.save(profile);
  }

  /** View player đầy đủ: profile + rating + lịch sử transaction. */
  async meView(userId: string) {
    const [profile, rating, history] = await Promise.all([
      this.profiles.findOne({ where: { userId } }),
      this.ratings.findOne({ where: { userId } }),
      this.txns.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 50,
      }),
    ]);
    return { profile, rating, history };
  }

  async publicView(userId: string) {
    const [profile, rating] = await Promise.all([
      this.profiles.findOne({ where: { userId } }),
      this.ratings.findOne({ where: { userId } }),
    ]);
    return {
      userId,
      displayName: profile?.displayName ?? null,
      region: profile?.region ?? null,
      rating: rating
        ? {
            rating: rating.rating,
            ratingDeviation: rating.ratingDeviation,
            ratingState: rating.ratingState,
            ratedMatches: rating.ratedMatches,
            uniqueOpponents: rating.uniqueOpponents,
          }
        : null,
    };
  }
}
