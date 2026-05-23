import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { TemplateRendererService } from './template-renderer.service';
import { TemplateVariablesService } from './template-variables.service';

@Module({
  imports: [PrismaModule],
  controllers: [TemplatesController],
  providers: [
    TemplatesService,
    TemplateRendererService,
    TemplateVariablesService,
  ],
  exports: [
    TemplatesService,
    TemplateRendererService,
    TemplateVariablesService,
  ],
})
export class TemplatesModule {}
