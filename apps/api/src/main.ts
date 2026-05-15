import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http/all-exceptions.filter';
import { csrfMiddleware } from './common/http/csrf.middleware';
import { requestIdMiddleware } from './common/http/request-id.middleware';
import { securityHeadersMiddleware } from './common/http/security-headers.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const webOrigin = config.getOrThrow<string>('WEB_ORIGIN');
  const port = config.getOrThrow<number>('API_PORT');

  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.use(securityHeadersMiddleware);
  app.use(requestIdMiddleware);
  app.use(cookieParser());
  app.use(csrfMiddleware);
  app.enableCors({
    origin: webOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-csrf-token', 'x-request-id'],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port);
}

void bootstrap();
