import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { GenerationService } from './generation.service';
import { OpenAiProvider } from './openai.provider';

@Module({
  imports: [PrismaModule],
  providers: [GenerationService, OpenAiProvider],
  exports: [GenerationService],
})
export class GenerationModule {}
