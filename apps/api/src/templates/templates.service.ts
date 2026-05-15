import { Injectable } from '@nestjs/common';
import type { Template } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export type PublicTemplate = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  language: string;
  ageMin: number | null;
  ageMax: number | null;
  pageCount: number;
  isActive: boolean;
};

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates() {
    const templates = await this.prisma.template.findMany({
      where: { isActive: true },
      orderBy: [{ title: 'asc' }],
    });

    return templates.map((template) => this.toPublicTemplate(template));
  }

  async getTemplateBySlug(slug: string) {
    const template = await this.prisma.template.findUnique({
      where: { slug, isActive: true },
    });

    if (!template) {
      return null;
    }

    return this.toPublicTemplate(template);
  }

  private toPublicTemplate(template: Template): PublicTemplate {
    return {
      id: template.id,
      slug: template.slug,
      title: template.title,
      description: template.description,
      language: template.language,
      ageMin: template.ageMin,
      ageMax: template.ageMax,
      pageCount: template.pageCount,
      isActive: template.isActive,
    };
  }
}
