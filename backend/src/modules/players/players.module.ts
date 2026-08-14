import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { PlayerProfile } from './entities/player-profile.entity';
import { RatingProfile } from '../ratings/entities/rating-profile.entity';
import { RatingTransaction } from '../ratings/entities/rating-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerProfile, RatingProfile, RatingTransaction]),
  ],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService],
})
export class PlayersModule {}
