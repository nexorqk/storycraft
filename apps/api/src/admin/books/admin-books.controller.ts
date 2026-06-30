import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/books')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminBooksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listBooks() {
    const books = await this.prisma.book.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        user: { select: { id: true, name: true, email: true } },
        template: { select: { id: true, slug: true, title: true } },
        child: { select: { id: true, name: true } },
        _count: { select: { pages: true } },
      },
    });

    return {
      books: books.map((b) => ({
        id: b.id,
        title: b.title,
        status: b.status,
        language: b.language,
        childName: b.child?.name ?? null,
        userName: b.user.name ?? b.user.email,
        userEmail: b.user.email,
        userId: b.user.id,
        templateSlug: b.template.slug,
        templateTitle: b.template.title,
        pageCount: b._count.pages,
        errorMessage: b.errorMessage,
        completedAt: b.completedAt?.toISOString() ?? null,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
    };
  }

  @Get(':bookId')
  async getBook(@Param('bookId', new ParseUUIDPipe()) bookId: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        user: {
          select: { id: true, name: true, email: true, locale: true },
        },
        template: {
          select: { id: true, slug: true, title: true },
        },
        child: {
          select: { id: true, name: true, interests: true },
        },
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
        illustrations: {
          orderBy: { createdAt: 'asc' },
        },
        jobs: {
          orderBy: { queuedAt: 'desc' },
          select: {
            id: true,
            type: true,
            status: true,
            attempts: true,
            maxAttempts: true,
            errorMessage: true,
            queuedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    return {
      book: {
        id: book.id,
        title: book.title,
        status: book.status,
        language: book.language,
        coverStyle: book.coverStyle,
        childNameInStory: book.childNameInStory,
        personalization: book.personalization,
        pdfObjectKey: book.pdfObjectKey,
        errorMessage: book.errorMessage,
        createdAt: book.createdAt.toISOString(),
        updatedAt: book.updatedAt.toISOString(),
        completedAt: book.completedAt?.toISOString() ?? null,
        user: book.user,
        template: book.template,
        child: book.child,
        pages: book.pages.map((p) => ({
          id: p.id,
          pageNumber: p.pageNumber,
          text: p.text,
          illustrationPrompt: p.illustrationPrompt,
          createdAt: p.createdAt.toISOString(),
        })),
        illustrations: book.illustrations.map((ill) => ({
          id: ill.id,
          pageId: ill.pageId,
          status: ill.status,
          prompt: ill.prompt,
          objectKey: ill.objectKey,
          errorMessage: ill.errorMessage,
          createdAt: ill.createdAt.toISOString(),
        })),
        jobs: book.jobs,
      },
    };
  }

  @Post(':bookId/retry')
  async retryBook(@Param('bookId', new ParseUUIDPipe()) bookId: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        jobs: {
          where: { status: { in: ['QUEUED', 'FAILED'] } },
          orderBy: { queuedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    if (book.status !== 'FAILED') {
      return { ok: true, message: 'Book is not in FAILED state, no action needed' };
    }

    const job = book.jobs[0];

    if (job) {
      await this.prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'QUEUED',
          attempts: 0,
          errorMessage: null,
          startedAt: null,
          completedAt: null,
        },
      });
    }

    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        status: 'PENDING',
        errorMessage: null,
      },
    });

    return { ok: true };
  }
}
