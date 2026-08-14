import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

import { EnvModule } from './common/config/env.module';
import { EnvService } from './common/config/env.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PlayersModule } from './modules/players/players.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { VenuesModule } from './modules/venues/venues.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { MatchesModule } from './modules/matches/matches.module';
import { QuickMatchesModule } from './modules/quick-matches/quick-matches.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { MobileOnlyGuard } from './common/guards/mobile-only.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    EnvModule,
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', verboseMemoryLeak: false }),
    JwtModule.register({}),
    ThrottlerModule.forRootAsync({
      inject: [EnvService],
      // Chỉ đăng ký 1 throttler global. Auth routes tự override limit qua @Throttle
      // (request-otp 5/min, verify-otp 10/min). Nếu đăng ký nhiều throttler global,
      // guard yêu cầu TẤT CẢ pass -> limit hiệu dụng = min(...) áp cho mọi route.
      useFactory: (env: EnvService) => [
        { name: 'default', ttl: env.throttleTtlMs, limit: env.throttleLimit },
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'badminton'),
        password: config.get<string>('DB_PASSWORD', 'badminton_dev'),
        database: config.get<string>('DB_NAME', 'badminton'),
        entities: [__dirname + '/modules/**/*.entity.{ts,js}'],
        // Dev-only: auto-sync. Production phải dùng migrations (expand-migrate-contract).
        // DB_SYNC bật chủ động khi chưa có migration (deploy DB mới).
        synchronize: config.get<string>('DB_SYNC', config.get<string>('NODE_ENV', 'development') !== 'production' ? 'true' : 'false') === 'true',
        logging: ['error', 'warn'],
        retryAttempts: 10,
        retryDelay: 3000,
        // max 20 connection; timeout 30s vì các transaction confirm dùng
        // pessimistic lock có thể xếp hàng chờ row-lock lâu dưới tải cao.
        extra: { max: 20, connectionTimeoutMillis: 30000 },
      }),
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    PlayersModule,
    RatingsModule,
    VenuesModule,
    SessionsModule,
    MatchesModule,
    QuickMatchesModule,
    NotificationsModule,
    AuditModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global guards: JWT (trừ @Public), RBAC (theo @Roles), Mobile-only (theo @MobileOnly)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: MobileOnlyGuard },
  ],
})
export class AppModule {}
