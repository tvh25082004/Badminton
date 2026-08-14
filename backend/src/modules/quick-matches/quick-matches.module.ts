import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from '../matches/entities/match.entity';
import { MatchPlayer } from '../matches/entities/match-player.entity';
import { QuickMatchesController } from './quick-matches.controller';
import { QuickMatchesService } from './quick-matches.service';
import { QrTokenService } from './qr-token.service';

@Module({
  imports: [TypeOrmModule.forFeature([Match, MatchPlayer])],
  controllers: [QuickMatchesController],
  providers: [QuickMatchesService, QrTokenService],
  exports: [QuickMatchesService, QrTokenService],
})
export class QuickMatchesModule {}
