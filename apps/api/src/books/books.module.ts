import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { GenerationQueueModule } from '../queues/generation-queue.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  imports: [AuthModule, PrismaModule, GenerationQueueModule],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
