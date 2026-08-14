import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { RatingProfile } from '../ratings/entities/rating-profile.entity';
import { UserService } from './users.service';
import { UsersController } from './users.controller';

/**
 * Global: UserService được dùng bởi JwtAuthGuard (global guard).
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, PlayerProfile, RatingProfile])],
  controllers: [UsersController],
  providers: [UserService],
  exports: [UserService],
})
export class UsersModule {}
