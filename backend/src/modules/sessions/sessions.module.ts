import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import { SessionParticipant } from './entities/session-participant.entity';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { RatingProfile } from '../ratings/entities/rating-profile.entity';
import { User } from '../auth/entities/user.entity';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      SessionParticipant,
      PlayerProfile,
      RatingProfile,
      User,
    ]),
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
