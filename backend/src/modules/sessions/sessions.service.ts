import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { SessionParticipant } from './entities/session-participant.entity';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { RatingProfile } from '../ratings/entities/rating-profile.entity';
import {
  BadRequestAppException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../common/errors/app-exception';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { createEvent, Events } from '../../common/events/domain-event';
import { User } from '../auth/entities/user.entity';
import { Venue as VenueAlias } from '../venues/entities/venue.entity';

const OPEN_STATUSES = ['DRAFT', 'OPEN', 'FULL'];

@Injectable()
export class SessionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly events: EventEmitter2,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(SessionParticipant)
    private readonly participants: Repository<SessionParticipant>,
    @InjectRepository(PlayerProfile)
    private readonly profiles: Repository<PlayerProfile>,
    @InjectRepository(RatingProfile)
    private readonly ratings: Repository<RatingProfile>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  private costPerPerson(session: Session, participantCount: number): number {
    const total =
      session.totalCost > 0
        ? session.totalCost
        : Object.values(session.costBreakdown ?? {}).reduce((a, b) => a + Number(b), 0);
    if (session.costSplitMode === 'CUSTOM') return Number(total);
    return Math.round(Number(total) / Math.max(1, participantCount));
  }

  // ------------------------------------------------------------------
  // Queries
  // ------------------------------------------------------------------

  async search(opts: {
    q?: string;
    region?: string;
    from?: string;
    to?: string;
    minRating?: number;
    maxRating?: number;
    format?: string;
    page: number;
    limit: number;
  }) {
    const qb = this.sessions
      .createQueryBuilder('s')
      .leftJoin(VenueAlias, 'v', 'v.id = s.venueId')
      .where('s.status IN (:...statuses)', { statuses: OPEN_STATUSES });
    if (opts.q) qb.andWhere('s.title ILIKE :q', { q: `%${opts.q}%` });
    if (opts.region) qb.andWhere('v.region = :region', { region: opts.region });
    if (opts.format) qb.andWhere('s.format = :format', { format: opts.format });
    if (opts.from) qb.andWhere('s.startAt >= :from', { from: opts.from });
    if (opts.to) qb.andWhere('s.startAt <= :to', { to: opts.to });
    if (opts.minRating !== undefined)
      qb.andWhere('(s.maxRating IS NULL OR s.maxRating >= :minRating)', {
        minRating: opts.minRating,
      });
    if (opts.maxRating !== undefined)
      qb.andWhere('(s.minRating IS NULL OR s.minRating <= :maxRating)', {
        maxRating: opts.maxRating,
      });

    qb.orderBy('s.startAt', 'ASC')
      .skip((opts.page - 1) * opts.limit)
      .take(opts.limit);
    const [items, total] = await qb.getManyAndCount();

    const withCounts = await Promise.all(
      items.map(async (s) => {
        const participantCount = await this.participants.count({
          where: { sessionId: s.id, status: 'JOINED' },
        });
        return {
          ...s,
          participantCount,
          costPerPerson: this.costPerPerson(s, participantCount),
        };
      }),
    );
    return { items: withCounts, total, page: opts.page, limit: opts.limit };
  }

  async detail(sessionId: string) {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('SESSION_NOT_FOUND', 'Session not found');

    const list = await this.participants.find({
      where: { sessionId, status: 'JOINED' },
      order: { createdAt: 'ASC' },
    });
    const participants = await Promise.all(
      list.map(async (p) => {
        const [profile, rating, user] = await Promise.all([
          this.profiles.findOne({ where: { userId: p.userId } }),
          this.ratings.findOne({ where: { userId: p.userId } }),
          this.users.findOne({ where: { id: p.userId } }),
        ]);
        return {
          userId: p.userId,
          status: p.status,
          joinedAt: p.createdAt,
          displayName: profile?.displayName ?? user?.displayName ?? 'Người chơi',
          region: profile?.region ?? null,
          rating: rating?.rating ?? null,
        };
      }),
    );
    return {
      ...session,
      participantCount: participants.length,
      costPerPerson: this.costPerPerson(session, participants.length),
      participants,
    };
  }

  // ------------------------------------------------------------------
  // Mutations
  // ------------------------------------------------------------------

  async create(hostId: string, dto: CreateSessionDto) {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    if (start >= end) {
      throw new BadRequestAppException('VALIDATION_FAILED', 'endAt must be after startAt');
    }
    if (dto.minParticipants > dto.maxParticipants) {
      throw new BadRequestAppException(
        'VALIDATION_FAILED',
        'minParticipants must be <= maxParticipants',
      );
    }

    const session = await this.sessions.save(
      this.sessions.create({
        hostId,
        venueId: dto.venueId ?? null,
        title: dto.title,
        description: dto.description ?? null,
        startAt: start,
        endAt: end,
        courtCount: dto.courtCount,
        minParticipants: dto.minParticipants,
        maxParticipants: dto.maxParticipants,
        minRating: dto.minRating ?? null,
        maxRating: dto.maxRating ?? null,
        format: dto.format,
        totalCost: dto.totalCost,
        costSplitMode: dto.costSplitMode,
        costBreakdown: dto.costBreakdown,
        genderLimit: dto.genderLimit ?? null,
        status: 'OPEN',
      }),
    );

    // Host tự join.
    await this.participants.save(
      this.participants.create({
        sessionId: session.id,
        userId: hostId,
        status: 'JOINED',
      }),
    );
    return this.detail(session.id);
  }

  async update(actorId: string, sessionId: string, dto: UpdateSessionDto) {
    return this.dataSource.transaction(async (em) => {
      const session = await em.findOne(Session, {
        where: { id: sessionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) throw new NotFoundException('SESSION_NOT_FOUND', 'Session not found');
      if (session.hostId !== actorId) {
        throw new ForbiddenException('Only the host can update this session');
      }
      if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
        throw new ConflictException(
          'SESSION_STATE_INVALID',
          `Cannot update a ${session.status} session`,
        );
      }

      // Chi phí: không được tăng nghĩa vụ thanh toán khi chưa được xác nhận (§7.3).
      const costChanged = dto.totalCost !== undefined || dto.costBreakdown !== undefined;
      if (costChanged) {
        if (session.status === 'IN_PROGRESS') {
          throw new ConflictException(
            'COST_SPLIT_LOCKED',
            'Cost plan is locked after the session has started',
          );
        }
        const currentParticipants = await em.count(SessionParticipant, {
          where: { sessionId, status: 'JOINED' },
        });
        const newTotal = dto.totalCost ?? session.totalCost;
        const newBreakdown = dto.costBreakdown ?? session.costBreakdown;
        const newPerPerson = Math.round(
          Number(newTotal > 0 ? newTotal : Object.values(newBreakdown).reduce((a, b) => a + Number(b), 0)) /
            Math.max(1, currentParticipants),
        );
        const oldPerPerson = this.costPerPerson(session, currentParticipants);
        if (newPerPerson > oldPerPerson && !dto.acknowledgeCostIncrease) {
          throw new ConflictException(
            'COST_SPLIT_LOCKED',
            `New cost raises cost per person (${oldPerPerson} → ${newPerPerson}). ` +
              `Set acknowledgeCostIncrease=true to confirm participants were informed.`,
          );
        }
        if (dto.totalCost !== undefined) session.totalCost = dto.totalCost;
        if (dto.costBreakdown !== undefined) session.costBreakdown = dto.costBreakdown;
      }

      if (dto.title !== undefined) session.title = dto.title;
      if (dto.description !== undefined) session.description = dto.description;
      if (dto.startAt !== undefined) session.startAt = new Date(dto.startAt);
      if (dto.endAt !== undefined) session.endAt = new Date(dto.endAt);
      if (dto.courtCount !== undefined) session.courtCount = dto.courtCount;
      if (dto.maxParticipants !== undefined) session.maxParticipants = dto.maxParticipants;

      await em.save(session);

      this.events.emit(
        Events.SessionUpdated,
        createEvent(Events.SessionUpdated, {
          sessionId,
          actorUserId: actorId,
          version: session.version,
          changedFields: Object.keys(dto),
        }),
      );
      return this.detail(session.id);
    });
  }

  async join(userId: string, sessionId: string) {
    return this.dataSource.transaction(async (em) => {
      const session = await em.findOne(Session, {
        where: { id: sessionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) throw new NotFoundException('SESSION_NOT_FOUND', 'Session not found');
      if (!OPEN_STATUSES.includes(session.status)) {
        throw new ConflictException(
          'SESSION_STATE_INVALID',
          `Cannot join a ${session.status} session`,
        );
      }
      if (new Date(session.startAt).getTime() < Date.now()) {
        throw new ConflictException('SESSION_STATE_INVALID', 'Session has already started');
      }

      const existing = await em.findOne(SessionParticipant, {
        where: { sessionId, userId },
      });
      if (existing && existing.status === 'JOINED') {
        throw new ConflictException('SESSION_ALREADY_JOINED', 'You already joined this session');
      }
      if (existing && existing.status === 'LEFT') {
        existing.status = 'JOINED';
        await em.save(existing);
      } else {
        const joined = await em.count(SessionParticipant, {
          where: { sessionId, status: 'JOINED' },
        });
        if (joined >= session.maxParticipants) {
          throw new ConflictException('SESSION_FULL', 'Session is full');
        }
        await em.save(
          em.create(SessionParticipant, { sessionId, userId, status: 'JOINED' }),
        );
      }

      const joinedNow = await em.count(SessionParticipant, {
        where: { sessionId, status: 'JOINED' },
      });
      session.status = joinedNow >= session.maxParticipants ? 'FULL' : 'OPEN';
      await em.save(session);

      this.events.emit(
        Events.SessionJoined,
        createEvent(Events.SessionJoined, { sessionId, actorUserId: userId }),
      );
      return this.detail(session.id);
    });
  }

  async leave(userId: string, sessionId: string) {
    return this.dataSource.transaction(async (em) => {
      const session = await em.findOne(Session, {
        where: { id: sessionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) throw new NotFoundException('SESSION_NOT_FOUND', 'Session not found');
      if (session.hostId === userId) {
        throw new BadRequestAppException(
          'SESSION_STATE_INVALID',
          'Host cannot leave; cancel the session instead',
        );
      }
      if (new Date(session.startAt).getTime() < Date.now()) {
        throw new ConflictException('SESSION_STATE_INVALID', 'Cannot leave after session started');
      }

      const participant = await em.findOne(SessionParticipant, {
        where: { sessionId, userId },
      });
      if (!participant || participant.status !== 'JOINED') {
        throw new NotFoundException('SESSION_NOT_PARTICIPANT', 'You are not in this session');
      }

      participant.status = 'LEFT';
      await em.save(participant);

      session.status = 'OPEN';
      await em.save(session);

      this.events.emit(
        Events.SessionLeft,
        createEvent(Events.SessionLeft, { sessionId, actorUserId: userId }),
      );
      return this.detail(session.id);
    });
  }

  async transition(
    actorId: string,
    sessionId: string,
    to: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    actualCost?: Record<string, number>,
  ) {
    return this.dataSource.transaction(async (em) => {
      const session = await em.findOne(Session, {
        where: { id: sessionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) throw new NotFoundException('SESSION_NOT_FOUND', 'Session not found');
      if (session.hostId !== actorId) {
        throw new ForbiddenException('Only the host can change session status');
      }

      const transitions: Record<string, string[]> = {
        IN_PROGRESS: ['DRAFT', 'OPEN', 'FULL'],
        COMPLETED: ['IN_PROGRESS'],
        CANCELLED: ['DRAFT', 'OPEN', 'FULL'],
      };
      if (!(transitions[to] ?? []).includes(session.status)) {
        throw new ConflictException(
          'SESSION_STATE_INVALID',
          `Cannot move session from ${session.status} to ${to}`,
        );
      }

      if (to === 'IN_PROGRESS') {
        const joinedNow = await em.count(SessionParticipant, {
          where: { sessionId, status: 'JOINED' },
        });
        if (joinedNow < session.minParticipants) {
          throw new ConflictException(
            'SESSION_STATE_INVALID',
            `Need at least ${session.minParticipants} participants to start`,
          );
        }
      }

      session.status = to;
      if (to === 'COMPLETED' && actualCost) {
        session.costBreakdown = actualCost;
        session.totalCost = Object.values(actualCost).reduce((a, b) => a + Number(b), 0);
      }
      await em.save(session);
      return this.detail(session.id);
    });
  }

  async mySessions(userId: string, page = 1, limit = 20) {
    const list = await this.participants.find({
      where: { userId, status: 'JOINED' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const sessions = await Promise.all(
      list.map(async (p) => {
        const s = await this.sessions.findOne({ where: { id: p.sessionId } });
        if (!s) return null;
        const participantCount = await this.participants.count({
          where: { sessionId: s.id, status: 'JOINED' },
        });
        return {
          ...s,
          participantCount,
          costPerPerson: this.costPerPerson(s, participantCount),
          isHost: s.hostId === userId,
        };
      }),
    );
    return { items: sessions.filter((s): s is NonNullable<typeof s> => !!s), total: list.length, page, limit };
  }
}
