import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import type { Book, BookStatus, Prisma } from '@prisma/client';
import { FREE_PLAN_MONTHLY_BOOK_LIMIT } from '@storycraft/shared';

import { JobsService } from '../jobs/jobs.service';
import { GENERATION_QUEUE } from '../queues/generation-queue.constants';
import { PrismaService } from '../prisma/prisma.service';
import { SafetyService } from '../safety/safety.service';
import { StorageService } from '../storage/storage.service';
import type { CreateBookDto } from './dto/create-book.dto';

export type BookProgress = {
  progress: number;
  status: string;
  completedPages?: number;
  totalPages?: number;
  error?: string;
};

export type PublicBook = {
  id: string;
  title: string | null;
  childNameInStory: string | null;
  coverStyle: string;
  language: string;
  personalization: Prisma.JsonValue | null;
  status: BookStatus;
  pdfObjectKey: string | null;
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  child: {
    id: string;
    name: string;
  };
  template: {
    id: string;
    slug: string;
    title: string;
  };
};

type GenerationJobData = {
  bookId: string;
  persistentJobId: string;
  status?: string;
  completedPages?: number;
  totalPages?: number;
  error?: string;
};

type FreeUsageUpdateResult = {
  freeGenerationsUsed: number;
  freeGenerationsPeriodStart: Date;
};

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly safety: SafetyService,
    @InjectQueue(GENERATION_QUEUE)
    private readonly generationQueue: Queue,
  ) {}

  async listBooks(userId: string) {
    const books = await this.prisma.book.findMany({
      where: { userId },
      include: {
        child: { select: { id: true, name: true } },
        template: { select: { id: true, slug: true, title: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return books.map((book) => this.toPublicBook(book));
  }

  async getBook(userId: string, bookId: string) {
    const full = await this.prisma.book.findFirst({
      where: { id: bookId, userId },
      include: {
        child: { select: { id: true, name: true } },
        template: { select: { id: true, slug: true, title: true } },
        pages: { orderBy: { pageNumber: 'asc' } },
        illustrations: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!full) {
      throw new NotFoundException('Book not found');
    }

    return {
      ...this.toPublicBook(full),
      pages: full.pages.map((page) => ({
        id: page.id,
        pageNumber: page.pageNumber,
        text: page.text,
        illustrationPrompt: page.illustrationPrompt,
      })),
      illustrations: full.illustrations.map((ill) => ({
        id: ill.id,
        pageNumber: ill.pageId,
        status: ill.status,
        objectKey: ill.objectKey,
      })),
    };
  }

  async createBook(userId: string, dto: CreateBookDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const child = await this.prisma.child.findFirst({
      where: { id: dto.childId, userId },
    });

    if (!child) {
      throw new NotFoundException('Child profile not found');
    }

    const template = await this.prisma.template.findFirst({
      where: { id: dto.templateId, isActive: true },
    });

    if (!template) {
      throw new NotFoundException('Template not found or inactive');
    }

    this.safety.assertUserInputAllowed([
      { label: 'Child name', value: child.name },
      { label: 'Child interests', value: child.interests },
      { label: 'Book title', value: dto.title },
      { label: 'Child name in story', value: dto.childNameInStory },
      {
        label: 'Personalization',
        value: this.extractPersonalizationText(dto.personalization),
      },
    ]);

    await this.enforceGenerationStartGuardrails(userId);

    const personalization = this.normalizePersonalization(dto.personalization);
    const usagePeriod = this.getCurrentFreeGenerationPeriod();
    const { book, persistentJob } = await this.prisma.$transaction(
      async (tx) => {
        const usageRows = await tx.$queryRaw<FreeUsageUpdateResult[]>`
          UPDATE "User"
          SET
            "freeGenerationsPeriodStart" = ${usagePeriod.start},
            "freeGenerationsUsed" = CASE
              WHEN "freeGenerationsPeriodStart" < ${usagePeriod.start} THEN 1
              ELSE "freeGenerationsUsed" + 1
            END
          WHERE "id" = ${userId}::uuid
            AND (
              "freeGenerationsPeriodStart" < ${usagePeriod.start}
              OR "freeGenerationsUsed" < ${FREE_PLAN_MONTHLY_BOOK_LIMIT}
            )
          RETURNING "freeGenerationsUsed", "freeGenerationsPeriodStart"
        `;

        if (usageRows.length === 0) {
          throw new BadRequestException(
            `Free plan limit reached (${FREE_PLAN_MONTHLY_BOOK_LIMIT} books). Upgrade your plan to generate more books.`,
          );
        }

        const createdBook = await tx.book.create({
          data: {
            userId,
            childId: dto.childId,
            templateId: dto.templateId,
            title: dto.title?.trim() || null,
            childNameInStory: dto.childNameInStory?.trim() || null,
            coverStyle: dto.coverStyle ?? 'default',
            language: dto.language ?? 'ru',
            ...(personalization ? { personalization } : {}),
          },
          include: {
            child: { select: { id: true, name: true } },
            template: { select: { id: true, slug: true, title: true } },
          },
        });

        const job = await tx.job.create({
          data: {
            type: 'GENERATE_BOOK',
            status: 'QUEUED',
            userId,
            bookId: createdBook.id,
            maxAttempts: 2,
            payload: {
              bookId: createdBook.id,
              trigger: 'create-book',
            },
          },
        });

        return { book: createdBook, persistentJob: job };
      },
    );

    try {
      await this.enqueueGenerationJob(book.id, persistentJob.id);
    } catch (error) {
      const message = this.formatError(error);

      await this.jobs.markQueueingFailed(persistentJob.id, book.id, message);
      await this.prisma.user.updateMany({
        where: {
          id: userId,
          freeGenerationsPeriodStart: usagePeriod.start,
          freeGenerationsUsed: { gt: 0 },
        },
        data: {
          freeGenerationsUsed: { decrement: 1 },
        },
      });

      throw error;
    }

    return this.toPublicBook(book);
  }

  async triggerGeneration(userId: string, bookId: string) {
    const book = await this.findOwnedBook(userId, bookId);

    if (book.status === 'PENDING' || book.status === 'PROCESSING') {
      throw new BadRequestException('Book is already being generated');
    }

    await this.enforceGenerationStartGuardrails(userId);

    const persistentJob = await this.prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: { id: bookId },
        data: {
          status: 'PENDING',
          errorMessage: null,
          completedAt: null,
          pdfObjectKey: null,
        },
      });

      await tx.illustration.deleteMany({
        where: { bookId },
      });

      await tx.bookPage.deleteMany({
        where: { bookId },
      });

      return tx.job.create({
        data: {
          type: 'GENERATE_BOOK',
          status: 'QUEUED',
          userId,
          bookId,
          maxAttempts: 2,
          payload: {
            bookId,
            trigger: 'manual-retry',
          },
        },
      });
    });

    try {
      await this.enqueueGenerationJob(bookId, persistentJob.id);
    } catch (error) {
      const message = this.formatError(error);
      await this.jobs.markQueueingFailed(persistentJob.id, bookId, message);
      throw error;
    }

    return {
      bookId,
      jobId: persistentJob.id,
      status: 'queued',
    };
  }

  async getUsage(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        freeGenerationsUsed: true,
        freeGenerationsPeriodStart: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const period = this.getCurrentFreeGenerationPeriod();
    const normalizedUser =
      user.freeGenerationsPeriodStart < period.start
        ? await this.prisma.user.update({
            where: { id: userId },
            data: {
              freeGenerationsUsed: 0,
              freeGenerationsPeriodStart: period.start,
            },
            select: {
              freeGenerationsUsed: true,
              freeGenerationsPeriodStart: true,
            },
          })
        : user;
    const periodStart = this.normalizePeriodStart(
      normalizedUser.freeGenerationsPeriodStart,
      period,
    );

    return {
      used: normalizedUser.freeGenerationsUsed,
      limit: FREE_PLAN_MONTHLY_BOOK_LIMIT,
      remaining: Math.max(
        0,
        FREE_PLAN_MONTHLY_BOOK_LIMIT - normalizedUser.freeGenerationsUsed,
      ),
      periodStart: periodStart.toISOString(),
      periodEnd: this.addUtcMonth(periodStart).toISOString(),
    };
  }

  async deleteBook(userId: string, bookId: string) {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, userId },
      select: {
        id: true,
        pdfObjectKey: true,
        illustrations: {
          select: {
            objectKey: true,
          },
        },
      },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    const objectKeys = [
      book.pdfObjectKey,
      ...book.illustrations.map((illustration) => illustration.objectKey),
    ].filter((key): key is string => Boolean(key));

    await this.storage.deleteFiles(objectKeys);

    await this.prisma.book.delete({
      where: { id: bookId },
    });
  }

  async getBookProgress(userId: string, bookId: string): Promise<BookProgress> {
    await this.findOwnedBook(userId, bookId);

    const persistentJob = await this.jobs.findLatestGenerationJob(bookId);
    const job = persistentJob
      ? await this.generationQueue.getJob(persistentJob.id)
      : await this.generationQueue.getJob(`book-${bookId}`);

    if (!job) {
      return persistentJob
        ? this.toProgressFromPersistentJob(persistentJob)
        : { progress: 0, status: 'pending' };
    }

    const state = await job.getState();
    const progress = job.progress as number;
    const data = job.data as Record<string, unknown>;

    if (state === 'completed') {
      return { progress: 100, status: 'completed' };
    }

    if (state === 'failed') {
      return {
        progress: progress ?? 0,
        status: 'failed',
        error:
          (data.error as string | undefined) ??
          job.failedReason ??
          persistentJob?.errorMessage ??
          'Unknown error',
      };
    }

    return {
      progress: progress ?? 0,
      status: (data.status as string) ?? state,
      completedPages: data.completedPages as number | undefined,
      totalPages: data.totalPages as number | undefined,
    };
  }

  async getGenerationJob(userId: string, jobId: string) {
    const persistentJob = await this.jobs.findGenerationJobForUser(
      userId,
      jobId,
    );

    if (!persistentJob) {
      throw new NotFoundException('Job not found');
    }

    const queueJob = await this.generationQueue.getJob(jobId);

    if (!queueJob) {
      const result = this.toRecord(persistentJob.result);

      return {
        id: persistentJob.id,
        name: 'generate-book',
        state: persistentJob.status.toLowerCase(),
        progress: this.toProgressFromPersistentJob(persistentJob).progress,
        data: persistentJob.payload,
        attemptsMade: persistentJob.attempts,
        processedOn: persistentJob.startedAt?.toISOString() ?? null,
        finishedOn: persistentJob.completedAt?.toISOString() ?? null,
        failedReason:
          persistentJob.errorMessage ?? this.optionalString(result.error),
      };
    }

    const state = await queueJob.getState();
    const data = queueJob.data as Record<string, unknown>;
    const progress = queueJob.progress as number;
    const finishedOn = queueJob.finishedOn;
    const processedOn = queueJob.processedOn;
    const attemptsMade = queueJob.attemptsMade;
    const failedReason = queueJob.failedReason;

    return {
      id: queueJob.id,
      name: queueJob.name,
      state,
      progress,
      data,
      attemptsMade,
      processedOn: processedOn ? new Date(processedOn).toISOString() : null,
      finishedOn: finishedOn ? new Date(finishedOn).toISOString() : null,
      failedReason: failedReason ?? persistentJob.errorMessage ?? null,
    };
  }

  private async findOwnedBook(userId: string, bookId: string) {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, userId },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    return book;
  }

  private async enforceGenerationStartGuardrails(userId: string) {
    this.ensureGenerationEnabled();
    await Promise.all([
      this.enforceActiveGenerationLimit(userId),
      this.enforceDailyGenerationJobLimit(userId),
    ]);
  }

  private ensureGenerationEnabled() {
    const enabled = this.config.get<boolean>('GENERATION_ENABLED') ?? true;

    if (!enabled) {
      throw new ServiceUnavailableException(
        'Book generation is temporarily disabled',
      );
    }
  }

  private async enforceActiveGenerationLimit(userId: string) {
    const maxActive =
      this.config.get<number>('GENERATION_MAX_ACTIVE_JOBS_PER_USER') ?? 1;

    if (maxActive <= 0) {
      return;
    }

    const activeCount = await this.prisma.book.count({
      where: {
        userId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (activeCount >= maxActive) {
      throw new BadRequestException(
        'You already have a book generation in progress',
      );
    }
  }

  private async enforceDailyGenerationJobLimit(userId: string) {
    const dailyLimit =
      this.config.get<number>('GENERATION_DAILY_JOB_LIMIT_PER_USER') ?? 10;

    if (dailyLimit <= 0) {
      return;
    }

    const now = new Date();
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const dailyJobs = await this.prisma.job.count({
      where: {
        userId,
        type: 'GENERATE_BOOK',
        queuedAt: { gte: dayStart },
      },
    });

    if (dailyJobs >= dailyLimit) {
      throw new BadRequestException(
        'Daily generation job limit reached. Try again tomorrow.',
      );
    }
  }

  private getCurrentFreeGenerationPeriod(now = new Date()) {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    return {
      start,
      end: this.addUtcMonth(start),
    };
  }

  private normalizePeriodStart(
    periodStart: Date,
    currentPeriod: { start: Date; end: Date },
  ) {
    if (periodStart >= currentPeriod.start && periodStart < currentPeriod.end) {
      return currentPeriod.start;
    }

    return periodStart;
  }

  private addUtcMonth(value: Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1),
    );
  }

  private enqueueGenerationJob(bookId: string, persistentJobId: string) {
    return this.generationQueue.add(
      'generate-book',
      {
        bookId,
        persistentJobId,
      } satisfies GenerationJobData,
      {
        jobId: persistentJobId,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );
  }

  private toProgressFromPersistentJob(
    persistentJob: Awaited<ReturnType<JobsService['findLatestGenerationJob']>>,
  ): BookProgress {
    if (!persistentJob) {
      return { progress: 0, status: 'pending' };
    }

    const result = this.toRecord(persistentJob.result);
    const progress = this.optionalNumber(result.progress);

    return {
      progress:
        progress ??
        (persistentJob.status === 'COMPLETED'
          ? 100
          : persistentJob.status === 'PROCESSING'
            ? 5
            : 0),
      status: persistentJob.status.toLowerCase(),
      completedPages: this.optionalNumber(result.completedPages),
      totalPages: this.optionalNumber(result.totalPages),
      error: persistentJob.errorMessage ?? this.optionalString(result.error),
    };
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private optionalNumber(value: unknown) {
    return typeof value === 'number' ? value : undefined;
  }

  private optionalString(value: unknown) {
    return typeof value === 'string' ? value : undefined;
  }

  private formatError(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private normalizePersonalization(
    personalization: Record<string, unknown> | undefined,
  ): Prisma.InputJsonObject | null {
    if (!personalization) {
      return null;
    }

    const normalized: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, value] of Object.entries(personalization)) {
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) {
        continue;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          normalized[key] = trimmed;
        }
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        normalized[key] = value;
      } else if (value === null) {
        normalized[key] = null;
      }
    }

    return Object.keys(normalized).length > 0
      ? (normalized as Prisma.InputJsonObject)
      : null;
  }

  private extractPersonalizationText(
    personalization: Record<string, unknown> | undefined,
  ): string[] {
    if (!personalization) {
      return [];
    }

    return Object.values(personalization)
      .filter(
        (value): value is string | number =>
          typeof value === 'string' || typeof value === 'number',
      )
      .map(String);
  }

  private toPublicBook(
    book: Book & {
      child: { id: string; name: string };
      template: { id: string; slug: string; title: string };
    },
  ): PublicBook {
    return {
      id: book.id,
      title: book.title,
      childNameInStory: book.childNameInStory,
      coverStyle: book.coverStyle,
      language: book.language,
      personalization: book.personalization,
      status: book.status,
      pdfObjectKey: book.pdfObjectKey,
      errorMessage: book.errorMessage,
      completedAt: book.completedAt?.toISOString() ?? null,
      createdAt: book.createdAt.toISOString(),
      updatedAt: book.updatedAt.toISOString(),
      child: book.child,
      template: book.template,
    };
  }
}
