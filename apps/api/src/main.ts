import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http/all-exceptions.filter';
import { csrfMiddleware } from './common/http/csrf.middleware';
import { requestIdMiddleware } from './common/http/request-id.middleware';
import { securityHeadersMiddleware } from './common/http/security-headers.middleware';
import {
  StructuredLogger,
  getLogLevels,
} from './common/logging/structured-logger';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const logger = new StructuredLogger('Bootstrap', isProduction);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: getLogLevels(isProduction),
    bufferLogs: true,
  });
  const config = app.get(ConfigService);
  const webOrigin = config.getOrThrow<string>('WEB_ORIGIN');
  const port = config.getOrThrow<number>('API_PORT');

  app.enableShutdownHooks();
  app.set('trust proxy', 1);
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

  logger.log(`Starting API server on port ${port}`, 'Bootstrap');
  await app.listen(port);
  logger.log(`API server is running on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
