import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { MatchPlayer } from './entities/match-player.entity';
import { MatchResult } from './entities/match-result.entity';
import { ResultConfirmation } from './entities/result-confirmation.entity';
import { Dispute } from './entities/dispute.entity';
import { CheckIn } from './entities/check-in.entity';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { AntiFraudService } from './anti-fraud.service';
import { RatingProfile } from '../ratings/entities/rating-profile.entity';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { User } from '../auth/entities/user.entity';
import { RatingsModule } from '../ratings/ratings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Match,
      MatchPlayer,
      MatchResult,
      ResultConfirmation,
      Dispute,
      CheckIn,
      RatingProfile,
      PlayerProfile,
      User,
    ]),
    RatingsModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService, AntiFraudService],
  exports: [MatchesService],
})
export class MatchesModule {}
