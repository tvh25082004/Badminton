import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { RatingProfile } from './entities/rating-profile.entity';
import { RatingTransaction } from './entities/rating-transaction.entity';
import { SelfAssessment } from './entities/self-assessment.entity';
import { MatchPlayer } from '../matches/entities/match-player.entity';
import { Match } from '../matches/entities/match.entity';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RatingProfile,
      RatingTransaction,
      SelfAssessment,
      MatchPlayer,
      Match,
      PlayerProfile,
      User,
    ]),
  ],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
