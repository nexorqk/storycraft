import { Injectable } from '@nestjs/common';
import type { Job as PersistentJob } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export type PublicJob = {
  id: string;
  type: string;
  status: string;
  bookId: string | null;
  attempts: number;
  maxAttempts: number;
  payload: unknown;
  result: unknown;
  errorMessage: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGenerationJob(data: {
    userId: string;
    bookId: string;
    trigger: string;
    maxAttempts?: number;
  }) {
    const { userId, bookId, trigger, maxAttempts = 2 } = data;

    return this.prisma.job.create({
      data: {
        type: 'GENERATE_BOOK',
        status: 'QUEUED',
        userId,
        bookId,
        maxAttempts,
        payload: { bookId, trigger },
      },
    });
  }

  async markQueueingFailed(
    persistentJobId: string,
    bookId: string,
    message: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.job.update({
        where: { id: persistentJobId },
        data: {
          status: 'FAILED',
          errorMessage: message,
          completedAt: new Date(),
          result: { status: 'failed', error: message },
        },
      }),
      this.prisma.book.update({
        where: { id: bookId },
        data: {
          status: 'FAILED',
          errorMessage: message,
        },
      }),
    ]);
  }

  async findLatestGenerationJob(bookId: string) {
    return this.prisma.job.findFirst({
      where: { bookId, type: 'GENERATE_BOOK' },
      orderBy: { queuedAt: 'desc' },
    });
  }

  async findGenerationJobForUser(userId: string, jobId: string) {
    return this.prisma.job.findFirst({
      where: { id: jobId, userId, type: 'GENERATE_BOOK' },
    });
  }

  async listJobsForBook(bookId: string) {
    const jobs = await this.prisma.job.findMany({
      where: { bookId },
      orderBy: { queuedAt: 'desc' },
    });

    return jobs.map((job) => this.toPublicJob(job));
  }

  toPublicJob(job: PersistentJob): PublicJob {
    return {
      id: job.id,
      type: job.type,
      status: job.status.toLowerCase(),
      bookId: job.bookId,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      payload: job.payload,
      result: job.result,
      errorMessage: job.errorMessage,
      queuedAt: job.queuedAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }
}