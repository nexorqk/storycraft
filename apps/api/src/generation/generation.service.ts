import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { TemplateRendererService } from '../templates/template-renderer.service';
import { TemplateVariablesService } from '../templates/template-variables.service';

type ProgressCallback = (completed: number, total: number) => Promise<void>;

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateRenderer: TemplateRendererService,
    private readonly templateVariables: TemplateVariablesService,
  ) {}

  async generateBook(
    bookId: string,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        child: true,
        template: { include: { pages: { orderBy: { pageNumber: 'asc' } } } },
      },
    });

    if (!book) {
      throw new Error(`Book ${bookId} not found`);
    }

    const totalPages = book.template.pages.length;

    try {
      await this.cleanupPartialData(bookId);

      const variables = this.templateVariables.buildVariables(book);

      for (const [index, templatePage] of book.template.pages.entries()) {
        const baseText = templatePage.baseText || templatePage.textPrompt;
        const renderedText = this.templateRenderer.renderText(
          baseText,
          variables,
        );

        this.logger.log(
          `Rendering template page ${templatePage.pageNumber} for book ${bookId}`,
        );

        await this.prisma.bookPage.create({
          data: {
            bookId,
            templatePageId: templatePage.id,
            pageNumber: templatePage.pageNumber,
            text: renderedText,
            illustrationPrompt: templatePage.illustrationPromptBase || null,
          },
        });

        this.logger.log(
          `Template page ${templatePage.pageNumber} rendered for book ${bookId}`,
        );

        if (onProgress) {
          await onProgress(index + 1, totalPages);
        }
      }

      await this.prisma.book.update({
        where: { id: bookId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          errorMessage: null,
          pdfObjectKey: null,
        },
      });

      this.logger.log(`Book ${bookId} generation completed`);
    } catch (error) {
      this.logger.error(`Book ${bookId} generation failed`, error);

      await this.prisma.book.update({
        where: { id: bookId },
        data: {
          status: 'FAILED',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  private async cleanupPartialData(bookId: string): Promise<void> {
    const existingPages = await this.prisma.bookPage.findMany({
      where: { bookId },
      include: { illustration: true },
    });

    if (existingPages.length === 0) {
      return;
    }

    this.logger.log(
      `Cleaning up ${existingPages.length} partial page(s) for book ${bookId} before retry`,
    );

    const pageIds = existingPages.map((p) => p.id);

    await this.prisma.illustration.deleteMany({
      where: { pageId: { in: pageIds } },
    });

    await this.prisma.bookPage.deleteMany({
      where: { bookId },
    });

    this.logger.log(`Partial data cleaned for book ${bookId}`);
  }
}
