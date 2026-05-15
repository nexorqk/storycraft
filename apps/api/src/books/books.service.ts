import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Book, BookStatus } from '@prisma/client';

import { GENERATION_QUEUE } from '../queues/generation-queue.constants';
import { PrismaService } from '../prisma/prisma.service';
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
  language: string;
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

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
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
    const book = await this.findOwnedBook(userId, bookId);

    const full = await this.prisma.book.findUnique({
      where: { id: book.id },
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

    const book = await this.prisma.book.create({
      data: {
        userId,
        childId: dto.childId,
        templateId: dto.templateId,
        title: dto.title?.trim() || null,
        language: dto.language ?? 'ru',
      },
      include: {
        child: { select: { id: true, name: true } },
        template: { select: { id: true, slug: true, title: true } },
      },
    });

    await this.generationQueue.add(
      'generate-book',
      { bookId: book.id },
      {
        jobId: `book-${book.id}`,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    return this.toPublicBook(book);
  }

  async deleteBook(userId: string, bookId: string) {
    await this.findOwnedBook(userId, bookId);

    await this.prisma.book.delete({
      where: { id: bookId },
    });
  }

  async getBookProgress(userId: string, bookId: string): Promise<BookProgress> {
    await this.findOwnedBook(userId, bookId);

    const job = await this.generationQueue.getJob(`book-${bookId}`);

    if (!job) {
      return { progress: 0, status: 'pending' };
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
        error: (data.error as string) ?? 'Unknown error',
      };
    }

    return {
      progress: progress ?? 0,
      status: (data.status as string) ?? state,
      completedPages: data.completedPages as number | undefined,
      totalPages: data.totalPages as number | undefined,
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

  private toPublicBook(
    book: Book & {
      child: { id: string; name: string };
      template: { id: string; slug: string; title: string };
    },
  ): PublicBook {
    return {
      id: book.id,
      title: book.title,
      language: book.language,
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
