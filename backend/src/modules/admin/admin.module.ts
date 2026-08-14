import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../auth/entities/user.entity';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { RatingProfile } from '../ratings/entities/rating-profile.entity';
import { RatingTransaction } from '../ratings/entities/rating-transaction.entity';
import { Match } from '../matches/entities/match.entity';
import { MatchPlayer } from '../matches/entities/match-player.entity';
import { MatchResult } from '../matches/entities/match-result.entity';
import { Dispute } from '../matches/entities/dispute.entity';
import { CheckIn } from '../matches/entities/check-in.entity';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      PlayerProfile,
      RatingProfile,
      RatingTransaction,
      Match,
      MatchPlayer,
      MatchResult,
      Dispute,
      CheckIn,
      SessionParticipant,
    ]),
    MatchesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
