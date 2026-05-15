import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { GenerationModule } from '../generation/generation.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GenerationProcessor } from './generation.processor';
import { GENERATION_QUEUE } from './generation-queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: GENERATION_QUEUE,
    }),
    PrismaModule,
    GenerationModule,
  ],
  providers: [GenerationProcessor],
  exports: [BullModule],
})
export class GenerationQueueModule {}
