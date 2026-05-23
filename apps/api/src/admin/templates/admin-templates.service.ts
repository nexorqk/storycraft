import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Template, TemplatePage } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import type { CreateAdminTemplateDto } from './dto/create-admin-template.dto';
import type { UpdateAdminTemplateDto } from './dto/update-admin-template.dto';
import type { CreateAdminTemplatePageDto } from './pages/dto/create-admin-template-page.dto';
import type { UpdateAdminTemplatePageDto } from './pages/dto/update-admin-template-page.dto';

export type AdminTemplateDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  language: string;
  ageMin: number | null;
  ageMax: number | null;
  pageCount: number;
  storyPrompt: string;
  illustrationStylePrompt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  pages: AdminTemplatePage[];
};

export type AdminTemplatePage = {
  id: string;
  pageNumber: number;
  textPrompt: string;
  illustrationPrompt: string;
  baseText: string;
  illustrationPromptBase: string | null;
  sceneDescription: string | null;
  personalizationSlots: unknown;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class AdminTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async listTemplates() {
    const templates = await this.prisma.template.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });

    return templates.map((t) => this.toPublicSummary(t));
  }

  async getTemplate(templateId: string): Promise<AdminTemplateDetail> {
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
      include: { pages: { orderBy: { pageNumber: 'asc' } } },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.toDetail(template);
  }

  async createTemplate(dto: CreateAdminTemplateDto) {
    const template = await this.prisma.template.create({
      data: {
        slug: dto.slug.trim(),
        title: dto.title.trim(),
        description: this.normalizeOptionalText(dto.description),
        language: dto.language ?? 'ru',
        ageMin: dto.ageMin,
        ageMax: dto.ageMax,
        pageCount: dto.pageCount ?? 8,
        storyPrompt: dto.storyPrompt.trim(),
        illustrationStylePrompt: dto.illustrationStylePrompt.trim(),
        isActive: dto.isActive ?? true,
      },
    });

    return this.toPublicSummary(template);
  }

  async updateTemplate(templateId: string, dto: UpdateAdminTemplateDto) {
    const existing = await this.prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    const template = await this.prisma.template.update({
      where: { id: templateId },
      data: {
        ...(dto.slug !== undefined ? { slug: dto.slug.trim() } : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: this.normalizeOptionalText(dto.description) }
          : {}),
        ...(dto.language !== undefined ? { language: dto.language } : {}),
        ...(dto.ageMin !== undefined ? { ageMin: dto.ageMin } : {}),
        ...(dto.ageMax !== undefined ? { ageMax: dto.ageMax } : {}),
        ...(dto.pageCount !== undefined ? { pageCount: dto.pageCount } : {}),
        ...(dto.storyPrompt !== undefined
          ? { storyPrompt: dto.storyPrompt.trim() }
          : {}),
        ...(dto.illustrationStylePrompt !== undefined
          ? { illustrationStylePrompt: dto.illustrationStylePrompt.trim() }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return this.toPublicSummary(template);
  }

  async deleteTemplate(templateId: string) {
    const existing = await this.prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    await this.prisma.template.delete({
      where: { id: templateId },
    });
  }

  async uploadCoverImage(templateId: string, file: Express.Multer.File) {
    const existing = await this.prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, and WebP images are allowed',
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    const ext =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    const objectKey = this.storage.buildKey(
      'template-covers',
      `${templateId}.${ext}`,
    );

    await this.storage.uploadFile(objectKey, file.buffer, file.mimetype);

    const template = await this.prisma.template.update({
      where: { id: templateId },
      data: { coverImageKey: objectKey },
    });

    return this.toPublicSummary(template);
  }

  async getCoverImageUrl(templateId: string) {
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
      select: { coverImageKey: true },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (!template.coverImageKey) {
      return { url: null };
    }

    const url = await this.storage.getSignedDownloadUrl(
      template.coverImageKey,
      86400,
    );
    return { url };
  }

  private toPublicSummary(template: Template) {
    return {
      id: template.id,
      slug: template.slug,
      title: template.title,
      isActive: template.isActive,
      pageCount: template.pageCount,
      language: template.language,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  private toDetail(
    template: Template & { pages: TemplatePage[] },
  ): AdminTemplateDetail {
    return {
      id: template.id,
      slug: template.slug,
      title: template.title,
      description: template.description,
      language: template.language,
      ageMin: template.ageMin,
      ageMax: template.ageMax,
      pageCount: template.pageCount,
      storyPrompt: template.storyPrompt,
      illustrationStylePrompt: template.illustrationStylePrompt,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      pages: template.pages.map((p) => ({
        id: p.id,
        pageNumber: p.pageNumber,
        textPrompt: p.textPrompt,
        illustrationPrompt: p.illustrationPrompt,
        baseText: p.baseText,
        illustrationPromptBase: p.illustrationPromptBase,
        sceneDescription: p.sceneDescription,
        personalizationSlots: p.personalizationSlots,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  }

  private normalizeOptionalText(value: string | undefined) {
    const normalized = value?.trim();
    return normalized || null;
  }

  private normalizeJsonObject(
    value: Record<string, unknown> | undefined,
  ): Prisma.InputJsonObject | undefined {
    if (!value) {
      return undefined;
    }

    const normalized: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, fieldValue] of Object.entries(value)) {
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) {
        continue;
      }

      if (typeof fieldValue === 'string') {
        normalized[key] = fieldValue.trim();
      } else if (
        typeof fieldValue === 'number' &&
        Number.isFinite(fieldValue)
      ) {
        normalized[key] = fieldValue;
      } else if (typeof fieldValue === 'boolean') {
        normalized[key] = fieldValue;
      } else if (fieldValue === null) {
        normalized[key] = null;
      }
    }

    return Object.keys(normalized).length > 0
      ? (normalized as Prisma.InputJsonObject)
      : undefined;
  }

  async createPage(
    templateId: string,
    dto: CreateAdminTemplatePageDto,
  ): Promise<AdminTemplatePage> {
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const page = await this.prisma.templatePage.create({
      data: {
        templateId,
        pageNumber: dto.pageNumber,
        textPrompt: dto.textPrompt.trim(),
        illustrationPrompt: dto.illustrationPrompt.trim(),
        baseText: (dto.baseText ?? dto.textPrompt).trim(),
        illustrationPromptBase: this.normalizeOptionalText(
          dto.illustrationPromptBase ?? dto.illustrationPrompt,
        ),
        sceneDescription: this.normalizeOptionalText(dto.sceneDescription),
        personalizationSlots: this.normalizeJsonObject(
          dto.personalizationSlots,
        ),
      },
    });

    return this.toPageDetail(page);
  }

  async updatePage(
    templateId: string,
    pageId: string,
    dto: UpdateAdminTemplatePageDto,
  ): Promise<AdminTemplatePage> {
    await this.findOwnedPage(templateId, pageId);

    const page = await this.prisma.templatePage.update({
      where: { id: pageId },
      data: {
        ...(dto.pageNumber !== undefined ? { pageNumber: dto.pageNumber } : {}),
        ...(dto.textPrompt !== undefined
          ? { textPrompt: dto.textPrompt.trim() }
          : {}),
        ...(dto.illustrationPrompt !== undefined
          ? { illustrationPrompt: dto.illustrationPrompt.trim() }
          : {}),
        ...(dto.baseText !== undefined
          ? { baseText: dto.baseText.trim() }
          : {}),
        ...(dto.illustrationPromptBase !== undefined
          ? {
              illustrationPromptBase: this.normalizeOptionalText(
                dto.illustrationPromptBase,
              ),
            }
          : {}),
        ...(dto.sceneDescription !== undefined
          ? {
              sceneDescription: this.normalizeOptionalText(
                dto.sceneDescription,
              ),
            }
          : {}),
        ...(dto.personalizationSlots !== undefined
          ? {
              personalizationSlots: this.normalizeJsonObject(
                dto.personalizationSlots,
              ),
            }
          : {}),
      },
    });

    return this.toPageDetail(page);
  }

  async deletePage(templateId: string, pageId: string): Promise<void> {
    await this.findOwnedPage(templateId, pageId);

    await this.prisma.templatePage.delete({
      where: { id: pageId },
    });
  }

  private async findOwnedPage(templateId: string, pageId: string) {
    const page = await this.prisma.templatePage.findFirst({
      where: { id: pageId, templateId },
    });

    if (!page) {
      throw new NotFoundException('Template page not found');
    }

    return page;
  }

  private toPageDetail(page: TemplatePage): AdminTemplatePage {
    return {
      id: page.id,
      pageNumber: page.pageNumber,
      textPrompt: page.textPrompt,
      illustrationPrompt: page.illustrationPrompt,
      baseText: page.baseText,
      illustrationPromptBase: page.illustrationPromptBase,
      sceneDescription: page.sceneDescription,
      personalizationSlots: page.personalizationSlots,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    };
  }
}
