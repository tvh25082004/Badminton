import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { EnvService } from './common/config/env.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ValidationError } from 'class-validator';
import * as express from 'express';
import { BadRequestAppException } from './common/errors/app-exception';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  const env = app.get(EnvService);

  app.setGlobalPrefix('api/v1');

  app.use(helmet());

  app.use(CorrelationIdMiddleware.apply());

  // CORS allow-list (không dùng '*' mặc định; hỗ trợ wildcard *.vercel.app)
  app.enableCors({
    origin: (origin, cb) => {
      if (env.isOriginAllowed(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  // Body size limit
  app.use(express.json({ limit: '1mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      exceptionFactory: (errors: ValidationError[]) => {
        const details = errors.map((e) => ({
          field: e.property,
          messages: Object.values(e.constraints ?? {}),
        }));
        const first = details[0];
        return new BadRequestAppException(
          'VALIDATION_FAILED',
          first ? first.messages[0] : 'Invalid request payload',
          details,
        );
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Badminton Platform API')
    .setDescription(
      'Shared backend cho ứng dụng ghép người chơi, tổ chức trận và xếp hạng cầu lông phong trào. ' +
        'Nguồn nghiệp vụ: Business Requirement v0.1 (MVP).',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization', in: 'header' },
      'access-token',
    )
    .addTag('auth', 'Đăng nhập bằng OTP, refresh, logout')
    .addTag('users', 'Tài khoản & hồ sơ người dùng')
    .addTag('players', 'Hồ sơ thể thao & self-assessment')
    .addTag('ratings', 'Elo, lịch sử rating, leaderboard')
    .addTag('venues', 'Sân / địa điểm')
    .addTag('sessions', 'Phiên chơi & chia chi phí')
    .addTag('matches', 'Trận đấu 2v2, kết quả, confirm, dispute')
    .addTag('quick-matches', 'Quick Rated Match qua QR động')
    .addTag('notifications', 'In-app inbox')
    .addTag('admin', 'Quản trị & moderation')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true, docExpansion: 'list' },
  });

  const port = env.port;
  await app.listen(port);
  new Logger('Bootstrap').log(
    `🚀 Badminton API running on http://localhost:${port}/api/v1 — Swagger: http://localhost:${port}/api/docs`,
  );
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error', err);
  process.exit(1);
});
