import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsListener } from './notifications.listener';
import { Notification } from './entities/notification.entity';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { MatchPlayer } from '../matches/entities/match-player.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, SessionParticipant, MatchPlayer]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
