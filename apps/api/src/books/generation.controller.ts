import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import type { PublicUser } from '../users/users.service';
import { GENERATION_QUEUE } from '../queues/generation-queue.constants';

@Controller('books')
@UseGuards(SessionAuthGuard)
export class GenerationController {
  constructor(
    @InjectQueue(GENERATION_QUEUE)
    private readonly generationQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':bookId/generate')
  async triggerGeneration(
    @CurrentUser() _user: PublicUser,
    @Param('bookId', new ParseUUIDPipe()) bookId: string,
  ) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        template: { select: { pages: { select: { id: true } } } },
      },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    if (book.status === 'PROCESSING') {
      throw new BadRequestException('Book is already being generated');
    }

    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        status: 'PENDING',
        errorMessage: null,
        completedAt: null,
      },
    });

    await this.prisma.bookPage.deleteMany({
      where: { bookId },
    });

    await this.prisma.illustration.deleteMany({
      where: { bookId },
    });

    const job = await this.generationQueue.add(
      'generate-book',
      { bookId },
      {
        jobId: `book-${bookId}`,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    return {
      bookId,
      jobId: job.id,
      status: 'queued',
    };
  }

  @Get('jobs/:jobId')
  async getJob(@Param('jobId') jobId: string) {
    const job = await this.generationQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const state = await job.getState();
    const data = job.data as Record<string, unknown>;
    const progress = job.progress as number;
    const finishedOn = job.finishedOn;
    const processedOn = job.processedOn;
    const attemptsMade = job.attemptsMade;
    const failedReason = job.failedReason;

    return {
      id: job.id,
      name: job.name,
      state,
      progress,
      data,
      attemptsMade,
      processedOn: processedOn ? new Date(processedOn).toISOString() : null,
      finishedOn: finishedOn ? new Date(finishedOn).toISOString() : null,
      failedReason: failedReason ?? null,
    };
  }
}
