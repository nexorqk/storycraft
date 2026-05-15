import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { StoryPageRequest, StoryPageResult } from './types';
import { OpenAiProvider } from './openai.provider';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openAi: OpenAiProvider,
  ) {}

  async generateBook(bookId: string): Promise<void> {
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

    await this.prisma.book.update({
      where: { id: bookId },
      data: { status: 'PROCESSING' },
    });

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
          `Generating page ${templatePage.pageNumber} for book ${bookId}`,
        );

        const result = await this.openAi.generatePage(request);
        generatedPages.push(result);

        await this.prisma.bookPage.create({
          data: {
            bookId,
            templatePageId: templatePage.id,
            pageNumber: templatePage.pageNumber,
            text: result.text,
            illustrationPrompt: result.illustrationPrompt,
          },
        });

        this.logger.log(
          `Page ${templatePage.pageNumber} generated for book ${bookId}`,
        );
      }

      await this.prisma.book.update({
        where: { id: bookId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
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
