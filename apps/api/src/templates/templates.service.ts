import { Injectable } from '@nestjs/common';
import type { Template, TemplatePage } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export type PublicTemplatePage = {
  pageNumber: number;
  textPrompt: string;
  illustrationPrompt: string;
  baseText: string;
  illustrationPromptBase: string | null;
  sceneDescription: string | null;
  personalizationSlots: unknown;
};

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
  pages: PublicTemplatePage[];
};

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates() {
    const templates = await this.prisma.template.findMany({
      where: { isActive: true },
      include: { pages: { orderBy: { pageNumber: 'asc' } } },
      orderBy: [{ title: 'asc' }],
    });

    return templates.map((template) => this.toPublicTemplate(template));
  }

  async getTemplateBySlug(slug: string) {
    const template = await this.prisma.template.findUnique({
      where: { slug, isActive: true },
      include: { pages: { orderBy: { pageNumber: 'asc' } } },
    });

    if (!template) {
      return null;
    }

    return this.toPublicTemplate(template);
  }

  private toPublicTemplate(
    template: Template & { pages: TemplatePage[] },
  ): PublicTemplate {
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
      pages: template.pages.map((page) => ({
        pageNumber: page.pageNumber,
        textPrompt: page.textPrompt,
        illustrationPrompt: page.illustrationPrompt,
        baseText: page.baseText,
        illustrationPromptBase: page.illustrationPromptBase,
        sceneDescription: page.sceneDescription,
        personalizationSlots: page.personalizationSlots,
      })),
    };
  }
}
