import { Injectable, Logger } from '@nestjs/common';

import { PdfService } from '../pdf/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { StoryPageRequest, StoryPageResult } from './types';
import { OpenAiProvider } from './openai.provider';
import { DallEProvider } from './dalle.provider';

type ProgressCallback = (completed: number, total: number) => Promise<void>;

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openAi: OpenAiProvider,
    private readonly dallE: DallEProvider,
    private readonly storage: StorageService,
    private readonly pdf: PdfService,
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
      const childName = book.child.name;
      const childAge = book.child.birthDate
        ? this.calculateAge(book.child.birthDate)
        : null;
      const childInterests = book.child.interests;

      const generatedPages: StoryPageResult[] = [];

      for (const templatePage of book.template.pages) {
        const request: StoryPageRequest = {
          childName,
          childAge,
          childInterests,
          templateStoryPrompt: book.template.storyPrompt,
          templateIllustrationStylePrompt:
            book.template.illustrationStylePrompt,
          pageNumber: templatePage.pageNumber,
          pageTextPrompt: templatePage.textPrompt,
          previousPages: generatedPages.map((p) => p.text),
        };

        this.logger.log(
          `Generating text for page ${templatePage.pageNumber} of book ${bookId}`,
        );

        const storyResult = await this.openAi.generatePage(request);
        generatedPages.push(storyResult);

        const bookPage = await this.prisma.bookPage.create({
          data: {
            bookId,
            templatePageId: templatePage.id,
            pageNumber: templatePage.pageNumber,
            text: storyResult.text,
            illustrationPrompt: storyResult.illustrationPrompt,
          },
        });

        this.logger.log(
          `Text generated for page ${templatePage.pageNumber} of book ${bookId}`,
        );

        this.logger.log(
          `Generating illustration for page ${templatePage.pageNumber} of book ${bookId}`,
        );

        const illustrationResult = await this.dallE.generate({
          prompt: storyResult.illustrationPrompt,
          bookId,
          pageNumber: templatePage.pageNumber,
        });

        const objectKey = this.storage.buildKey(
          'illustrations',
          bookId,
          `${templatePage.pageNumber}.png`,
        );

        await this.storage.uploadFile(
          objectKey,
          illustrationResult.buffer,
          illustrationResult.mimeType,
        );

        await this.prisma.illustration.create({
          data: {
            bookId,
            pageId: bookPage.id,
            status: 'COMPLETED',
            prompt: storyResult.illustrationPrompt,
            objectKey,
            provider: 'dall-e',
          },
        });

        this.logger.log(
          `Illustration uploaded for page ${templatePage.pageNumber} of book ${bookId}`,
        );

        if (onProgress) {
          await onProgress(templatePage.pageNumber, totalPages);
        }
      }

      this.logger.log(`Generating PDF for book ${bookId}`);

      const pdfObjectKey = await this.pdf.generateBookPdf(bookId);

      await this.prisma.book.update({
        where: { id: bookId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          pdfObjectKey,
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

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }
}
