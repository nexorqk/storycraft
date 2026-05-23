import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { TemplatesModule } from '../templates/templates.module';
import { GenerationService } from './generation.service';

@Module({
  imports: [PrismaModule, TemplatesModule],
  providers: [GenerationService],
  exports: [GenerationService],
})
export class GenerationModule {}
