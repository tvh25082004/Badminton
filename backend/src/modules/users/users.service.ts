import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { RatingProfile } from '../ratings/entities/rating-profile.entity';
import { NotFoundException } from '../../common/errors/app-exception';
import { USER_STATUS_ACTIVE } from '../../common/constants/domain';

export interface MeView {
  id: string;
  phone: string;
  role: string;
  status: string;
  displayName: string | null;
  profile: PlayerProfile | null;
  rating: RatingProfile | null;
  hasCompletedAssessment: boolean;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(PlayerProfile)
    private readonly profiles: Repository<PlayerProfile>,
    @InjectRepository(RatingProfile)
    private readonly ratings: Repository<RatingProfile>,
  ) {}

  /** Dùng bởi JwtAuthGuard — không expose ra API. */
  async findByIdInternal(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND', 'User not found');
    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.users.findOne({ where: { phone } });
  }

  async create(phone: string, role: 'PLAYER' | 'MODERATOR' | 'ADMIN' = 'PLAYER'): Promise<User> {
    return this.users.save(this.users.create({ phone, role, status: USER_STATUS_ACTIVE }));
  }

  /** View tổng hợp cho GET /users/me (dashboard). */
  async meView(userId: string): Promise<MeView> {
    const user = await this.findById(userId);
    const profile = await this.profiles.findOne({ where: { userId } });
    const rating = await this.ratings.findOne({ where: { userId } });
    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      status: user.status,
      displayName: user.displayName ?? profile?.displayName ?? null,
      profile,
      rating,
      hasCompletedAssessment: !!rating,
    };
  }

  async search(q?: string, page = 1, limit = 20) {
    const qb = this.users.createQueryBuilder('u');
    if (q) {
      qb.where('u.phone LIKE :q OR u.displayName ILIKE :q', { q: `%${q}%` });
    }
    qb.orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async setStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<User> {
    const user = await this.findById(userId);
    user.status = status;
    return this.users.save(user);
  }
}
