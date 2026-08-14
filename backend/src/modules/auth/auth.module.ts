import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { User } from './entities/user.entity';
import { RefreshSession } from './entities/refresh-session.entity';
import { OtpAttempt } from './entities/otp-attempt.entity';
import { OtpCode } from './entities/otp-code.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshSession, OtpAttempt, OtpCode]),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService],
  exports: [AuthService],
})
export class AuthModule {}
