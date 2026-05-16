import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { PdfModule } from '../pdf/pdf.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SafetyModule } from '../safety/safety.module';
import { StorageModule } from '../storage/storage.module';
import { DallEProvider } from './dalle.provider';
import { GenerationService } from './generation.service';
import { MockIllustrationProvider } from './mock-illustration.provider';
import { MockStoryProvider } from './mock-story.provider';
import { OpenAiProvider } from './openai.provider';
import type { IllustrationProvider } from './illustration-types';
import type { StoryProvider } from './types';

@Module({
  imports: [PrismaModule, StorageModule, PdfModule, ConfigModule, SafetyModule],
  providers: [
    GenerationService,
    {
      provide: 'STORY_PROVIDER',
      inject: [ConfigService],
      useFactory: (config: ConfigService): StoryProvider => {
        const useMock = config.get<string>('USE_MOCK_AI') === 'true';
        return useMock ? new MockStoryProvider() : new OpenAiProvider(config);
      },
    },
    {
      provide: 'ILLUSTRATION_PROVIDER',
      inject: [ConfigService],
      useFactory: (config: ConfigService): IllustrationProvider => {
        const useMock = config.get<string>('USE_MOCK_AI') === 'true';
        return useMock
          ? new MockIllustrationProvider()
          : new DallEProvider(config);
      },
    },
  ],
  exports: [GenerationService],
})
export class GenerationModule {}
