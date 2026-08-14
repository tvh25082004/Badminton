import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Match } from '../matches/entities/match.entity';
import { MatchPlayer } from '../matches/entities/match-player.entity';
import { QrTokenService } from './qr-token.service';
import {
  BadRequestAppException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../common/errors/app-exception';
import { MATCH_MODE_RATED, MATCH_STATUS_DRAFT, MATCH_STATUS_READY } from '../../common/constants/domain';

@Injectable()
export class QuickMatchesService {
  constructor(
    @InjectRepository(Match) private readonly matchRepo: Repository<Match>,
    @InjectRepository(MatchPlayer) private readonly mpRepo: Repository<MatchPlayer>,
    private readonly qr: QrTokenService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async create(creatorId: string, deviceId: string, format: 'BEST_OF_3' | 'SINGLE_GAME_21') {
    const inviteTtl = this.config.get<number>('QR_INVITE_TTL_SECONDS', 300);
    const match = await this.matchRepo.save(
      this.matchRepo.create({
        matchType: 'QUICK',
        mode: MATCH_MODE_RATED,
        format,
        status: MATCH_STATUS_DRAFT,
        creatorId,
        quickInviteExpiresAt: new Date(Date.now() + inviteTtl * 1000),
      }),
    );

    await this.mpRepo.save(
      this.mpRepo.create({
        matchId: match.id,
        userId: creatorId,
        team: 'A',
        rosterConfirmed: false,
        deviceId,
        joinedAt: new Date(),
        qrWindow: String(this.qr.currentWindow()),
      }),
    );

    return {
      matchId: match.id,
      inviteExpiresAt: match.quickInviteExpiresAt,
      qrToken: this.qr.sign({ matchId: match.id, window: this.qr.currentWindow() }),
    };
  }

  async currentQrToken(matchId: string): Promise<string> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('MATCH_NOT_FOUND', 'Quick match not found');
    if (match.matchType !== 'QUICK') {
      throw new BadRequestAppException('MATCH_STATE_INVALID', 'Not a quick match');
    }
    if (match.quickInviteExpiresAt && match.quickInviteExpiresAt.getTime() < Date.now()) {
      throw new BadRequestAppException('QR_INVITE_EXPIRED', 'Quick match invite has expired');
    }
    return this.qr.sign({ matchId: match.id, window: this.qr.currentWindow() });
  }

  async join(userId: string, deviceId: string, matchId: string, token: string, team: 'A' | 'B') {
    let payload: { matchId: string; window: number };
    try {
      payload = this.qr.verify(token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'INVALID_TOKEN';
      throw new BadRequestAppException(
        msg === 'TOKEN_EXPIRED' ? 'QR_TOKEN_EXPIRED' : 'VALIDATION_FAILED',
        msg === 'TOKEN_EXPIRED' ? 'QR token expired. Scan the current QR code.' : 'Invalid QR token',
      );
    }
    if (payload.matchId !== matchId) {
      throw new BadRequestAppException('VALIDATION_FAILED', 'QR token does not belong to this match');
    }

    return this.dataSource.transaction(async (em) => {
      const match = await em
        .createQueryBuilder(Match, 'm')
        .setLock('pessimistic_write')
        .where('m.id = :id', { id: matchId })
        .getOne();
      if (!match) throw new NotFoundException('MATCH_NOT_FOUND', 'Quick match not found');
      if (match.matchType !== 'QUICK') {
        throw new BadRequestAppException('MATCH_STATE_INVALID', 'Not a quick match');
      }
      if (match.status !== MATCH_STATUS_DRAFT && match.status !== MATCH_STATUS_READY) {
        throw new BadRequestAppException('QUICK_MATCH_NOT_READY', 'Quick match is no longer accepting joins');
      }
      if (match.quickInviteExpiresAt && match.quickInviteExpiresAt.getTime() < Date.now()) {
        throw new BadRequestAppException('QR_INVITE_EXPIRED', 'Quick match invite has expired');
      }

      const existing = await em.findOne(MatchPlayer, { where: { matchId, userId } });
      if (existing) {
        throw new ConflictException('QR_ALREADY_JOINED', 'You already joined this quick match');
      }

      const joined = await em.find(MatchPlayer, { where: { matchId } });
      if (joined.length >= 4) {
        throw new ConflictException('QUICK_MATCH_FULL', 'Quick match already has 4 players');
      }
      if (joined.some((p) => p.team === team) && team === 'B' && joined.filter((p) => p.team === 'B').length >= 2) {
        throw new BadRequestAppException('MATCH_ROSTER_INVALID', 'Team B is full');
      }
      if (joined.some((p) => p.team === team) && team === 'A' && joined.filter((p) => p.team === 'A').length >= 2) {
        throw new BadRequestAppException('MATCH_ROSTER_INVALID', 'Team A is full');
      }

      await em.save(
        em.create(MatchPlayer, {
          matchId,
          userId,
          team,
          rosterConfirmed: false,
          deviceId,
          joinedAt: new Date(),
          qrWindow: String(payload.window),
        }),
      );

      const after = await em.find(MatchPlayer, { where: { matchId } });
      if (after.length === 4) {
        match.status = MATCH_STATUS_READY;
        await em.save(match);
      }

      return { joined: true, joinedCount: after.length, status: match.status };
    });
  }

  async setupConfirm(userId: string, matchId: string, deviceId: string) {
    const player = await this.mpRepo.findOne({ where: { matchId, userId } });
    if (!player) throw new ForbiddenException('You are not a participant of this quick match');
    player.rosterConfirmed = true;
    player.deviceId = deviceId;
    await this.mpRepo.save(player);

    const all = await this.mpRepo.find({ where: { matchId } });
    if (all.length === 4 && all.every((p) => p.rosterConfirmed)) {
      await this.matchRepo.update({ id: matchId }, { status: MATCH_STATUS_READY });
    }
    return { confirmed: true, rosterConfirmed: all.filter((p) => p.rosterConfirmed).length, total: all.length };
  }

  async getDetail(matchId: string) {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('MATCH_NOT_FOUND', 'Quick match not found');
    const players = await this.mpRepo.find({ where: { matchId }, order: { team: 'ASC', createdAt: 'ASC' } });
    return {
      matchId: match.id,
      status: match.status,
      format: match.format,
      creatorId: match.creatorId,
      inviteExpiresAt: match.quickInviteExpiresAt,
      players: players.map((p) => ({ userId: p.userId, team: p.team, rosterConfirmed: p.rosterConfirmed })),
    };
  }
}
