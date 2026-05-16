import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { GenerationQueueModule } from '../queues/generation-queue.module';
import { JobsModule } from '../jobs/jobs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SafetyModule } from '../safety/safety.module';
import { StorageModule } from '../storage/storage.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { GenerationController } from './generation.controller';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    GenerationQueueModule,
    StorageModule,
    JobsModule,
    SafetyModule,
  ],
  controllers: [BooksController, GenerationController],
  providers: [BooksService],
})
export class BooksModule {}
