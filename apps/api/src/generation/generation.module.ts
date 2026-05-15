import { Module } from '@nestjs/common';

import { PdfModule } from '../pdf/pdf.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { DallEProvider } from './dalle.provider';
import { GenerationService } from './generation.service';
import { OpenAiProvider } from './openai.provider';

@Module({
  imports: [PrismaModule, StorageModule, PdfModule],
  providers: [GenerationService, OpenAiProvider, DallEProvider],
  exports: [GenerationService],
})
export class GenerationModule {}
