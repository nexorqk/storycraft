import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { GenerationService } from '../generation/generation.service';
import { PrismaService } from '../prisma/prisma.service';
import { GENERATION_QUEUE } from './generation-queue.constants';

type GenerationJobData = {
  bookId: string;
  status?: string;
  completedPages?: number;
  totalPages?: number;
  error?: string;
};

@Processor(GENERATION_QUEUE)
export class GenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerationProcessor.name);

  constructor(
    private readonly generation: GenerationService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<GenerationJobData>): Promise<void> {
    const { bookId } = job.data;

    this.logger.log(`Processing generation job ${job.id} for book ${bookId}`);

    await job.updateProgress(0);
    await job.updateData({ ...job.data, status: 'starting' });

    try {
      const book = await this.prisma.book.findUnique({
        where: { id: bookId },
        include: {
          template: { select: { pages: { select: { id: true } } } },
        },
      });

      if (!book) {
        throw new Error(`Book ${bookId} not found`);
      }

      const totalPages = book.template.pages.length;

      await this.prisma.book.update({
        where: { id: bookId },
        data: { status: 'PROCESSING' },
      });

      await job.updateProgress(5);

      const progressCallback = async (
        completedPages: number,
        totalPagesCount: number,
      ) => {
        const progress = Math.round(
          5 + (completedPages / totalPagesCount) * 90,
        );
        await job.updateProgress(progress);
        await job.updateData({
          ...job.data,
          status: 'generating',
          completedPages,
          totalPages: totalPagesCount,
        });
      };

      await this.generation.generateBook(bookId, progressCallback);

      await job.updateProgress(100);
      await job.updateData({ ...job.data, status: 'completed' });

      this.logger.log(`Generation job ${job.id} completed for book ${bookId}`);
    } catch (error) {
      this.logger.error(
        `Generation job ${job.id} failed for book ${bookId}`,
        error,
      );

      await job.updateData({
        ...job.data,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }
}
