import { Controller, Get, NotFoundException, Param } from '@nestjs/common';

import { TemplatesService } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  async listTemplates() {
    return {
      templates: await this.templates.listTemplates(),
    };
  }

  @Get(':slug')
  async getTemplate(@Param('slug') slug: string) {
    const template = await this.templates.getTemplateBySlug(slug);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return {
      template,
    };
  }
}
