import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EloConfig } from '../modules/ratings/entities/elo-config.entity';
import { EloConfigService } from './services/elo-config.service';
import { DatabaseInitService } from './database-init.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([EloConfig])],
  providers: [EloConfigService, DatabaseInitService],
  exports: [EloConfigService],
})
export class DatabaseModule {}
