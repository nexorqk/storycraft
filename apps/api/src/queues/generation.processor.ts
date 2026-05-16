import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import type { Prisma } from '@prisma/client';

import { ContentPolicyError, ProviderAuthError } from '../generation/errors';
import { GenerationService } from '../generation/generation.service';
import { PrismaService } from '../prisma/prisma.service';
import { GENERATION_QUEUE } from './generation-queue.constants';

type GenerationJobData = {
  bookId: string;
  persistentJobId?: string;
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
    const { bookId, persistentJobId } = job.data;

    this.logger.log(`Processing generation job ${job.id} for book ${bookId}`);

    await job.updateProgress(0);
    await job.updateData({ ...job.data, status: 'starting' });
    await this.updatePersistentJob(persistentJobId, {
      status: 'PROCESSING',
      attempts: job.attemptsMade + 1,
      startedAt: new Date(),
      errorMessage: null,
      result: {
        status: 'starting',
        progress: 0,
      },
    });

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
        await this.updatePersistentJob(persistentJobId, {
          result: {
            status: 'generating',
            progress,
            completedPages,
            totalPages: totalPagesCount,
          },
        });
      };

      await this.generation.generateBook(bookId, progressCallback);

      await job.updateProgress(100);
      await job.updateData({ ...job.data, status: 'completed' });
      await this.updatePersistentJob(persistentJobId, {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: {
          status: 'completed',
          progress: 100,
          completedPages: totalPages,
          totalPages,
        },
      });

      this.logger.log(`Generation job ${job.id} completed for book ${bookId}`);
    } catch (error) {
      const isNonRetryable =
        error instanceof ContentPolicyError ||
        error instanceof ProviderAuthError;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Generation job ${job.id} failed for book ${bookId}${isNonRetryable ? ' (non-retryable)' : ''}`,
        error instanceof Error ? error.stack : undefined,
      );

      await job.updateData({
        ...job.data,
        status: 'failed',
        error: errorMessage,
      });
      await this.updatePersistentJob(persistentJobId, {
        status: 'FAILED',
        errorMessage,
        completedAt: new Date(),
        result: {
          status: 'failed',
          progress: typeof job.progress === 'number' ? job.progress : 0,
          error: errorMessage,
        },
      });

      throw error;
    }
  }

  private async updatePersistentJob(
    persistentJobId: string | undefined,
    data: Prisma.JobUpdateInput,
  ) {
    if (!persistentJobId) {
      return;
    }

    try {
      await this.prisma.job.update({
        where: { id: persistentJobId },
        data,
      });
    } catch (error) {
      this.logger.warn(
        `Could not update persistent job ${persistentJobId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
