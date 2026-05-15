import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { DallEProvider } from './dalle.provider';
import { GenerationService } from './generation.service';
import { OpenAiProvider } from './openai.provider';

@Module({
  imports: [PrismaModule, StorageModule],
  providers: [GenerationService, OpenAiProvider, DallEProvider],
  exports: [GenerationService],
})
export class GenerationModule {}
