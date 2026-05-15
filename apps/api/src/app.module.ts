import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { throttlerModule, throttlerGuardProvider } from './common/http/throttler.config';
import { ChildrenModule } from './children/children.module';
import { validateEnv } from './config/env.validation';
import { GenerationModule } from './generation/generation.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { PrismaModule } from './prisma/prisma.module';
import { GenerationQueueModule } from './queues/generation-queue.module';
import { QueuesModule } from './queues/queues.module';
import { StorageModule } from './storage/storage.module';
import { TemplatesModule } from './templates/templates.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    throttlerModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ChildrenModule,
    TemplatesModule,
    BooksModule,
    JobsModule,
    QueuesModule,
    StorageModule,
    GenerationModule,
    AdminModule,
    GenerationQueueModule,
  ],
  providers: [throttlerGuardProvider],
})
export class AppModule {}
