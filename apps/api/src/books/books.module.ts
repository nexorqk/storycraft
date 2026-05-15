import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { GenerationQueueModule } from '../queues/generation-queue.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { GenerationController } from './generation.controller';

@Module({
  imports: [AuthModule, PrismaModule, GenerationQueueModule, StorageModule],
  controllers: [BooksController, GenerationController],
  providers: [BooksService],
})
export class BooksModule {}
