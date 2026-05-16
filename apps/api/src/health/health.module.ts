import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { GENERATION_QUEUE } from '../queues/generation-queue.constants';
import { QueuesModule } from '../queues/queues.module';
import { StorageModule } from '../storage/storage.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [
    PrismaModule,
    QueuesModule,
    BullModule.registerQueue({
      name: GENERATION_QUEUE,
    }),
    StorageModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
