import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';

import { BooksService } from '../books.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GENERATION_QUEUE } from '../../queues/generation-queue.constants';

const userA = 'user-a';
const userB = 'user-b';
const childA = 'child-a';
const childB = 'child-b';
const templateId = 'template-1';
const bookA = 'book-a';
const jobA = 'job-a';

function makePrismaMock() {
  return {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    book: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    bookPage: { deleteMany: jest.fn() },
    child: { findFirst: jest.fn() },
    illustration: { deleteMany: jest.fn() },
    job: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    template: { findFirst: jest.fn() },
  };
}

const mockQueue = {
  add: jest.fn(),
  getJob: jest.fn(),
};

function setupCreateBookMocks(prisma: ReturnType<typeof makePrismaMock>) {
  prisma.user.findUnique.mockResolvedValue({ id: userA });
  prisma.child.findFirst.mockResolvedValue({ id: childA, name: 'Masha' });
  prisma.template.findFirst.mockResolvedValue({
    id: templateId,
    isActive: true,
  });
  prisma.$queryRaw.mockResolvedValue([
    {
      freeGenerationsUsed: 1,
      freeGenerationsPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
    },
  ]);
  prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof prisma) => unknown)(prisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  prisma.book.create.mockResolvedValue({
    id: bookA,
    title: 'Test',
    childNameInStory: null,
    coverStyle: 'default',
    language: 'ru',
    status: 'PENDING',
    pdfObjectKey: null,
    errorMessage: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    child: { id: childA, name: 'Masha' },
    template: { id: templateId, slug: 'adventure', title: 'Adventure' },
  });
  prisma.job.create.mockResolvedValue({ id: jobA });
  mockQueue.add.mockResolvedValue({ id: jobA });
}

describe('Books ownership boundaries', () => {
  let service: BooksService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(GENERATION_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  describe('createBook — child ownership', () => {
    it('rejects creation when child belongs to another user', async () => {
      setupCreateBookMocks(prisma);
      prisma.child.findFirst.mockResolvedValue(null);

      await expect(
        service.createBook(userA, {
          childId: childB,
          templateId,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.book.create).not.toHaveBeenCalled();
    });
  });

  describe('getBook — cross-user access', () => {
    it('rejects access to a book owned by another user', async () => {
      prisma.book.findFirst.mockResolvedValue(null);

      await expect(service.getBook(userB, bookA)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.book.findFirst).toHaveBeenCalledWith({
        where: { id: bookA, userId: userB },
      });
    });
  });

  describe('deleteBook — cross-user access', () => {
    it('rejects deletion of a book owned by another user', async () => {
      prisma.book.findFirst.mockResolvedValue(null);

      await expect(service.deleteBook(userB, bookA)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.book.delete).not.toHaveBeenCalled();
    });
  });

  describe('triggerGeneration — cross-user access', () => {
    it('rejects generation trigger for a book owned by another user', async () => {
      prisma.book.findFirst.mockResolvedValue(null);

      await expect(service.triggerGeneration(userB, bookA)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('allows the owner to trigger generation', async () => {
      prisma.book.findFirst.mockResolvedValue({
        id: bookA,
        status: 'FAILED',
      });
      prisma.book.update.mockResolvedValue({});
      prisma.illustration.deleteMany.mockResolvedValue({});
      prisma.bookPage.deleteMany.mockResolvedValue({});
      prisma.$transaction.mockImplementation(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: typeof prisma) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      });
      prisma.job.create.mockResolvedValue({ id: 'new-job' });
      mockQueue.add.mockResolvedValue({ id: 'new-job' });

      const result = await service.triggerGeneration(userA, bookA);

      expect(result.bookId).toBe(bookA);
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });

  describe('getGenerationJob — cross-user access', () => {
    it('rejects access to a job owned by another user', async () => {
      prisma.job.findFirst.mockResolvedValue(null);

      await expect(service.getGenerationJob(userB, jobA)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the job for the owning user', async () => {
      prisma.job.findFirst.mockResolvedValue({
        id: jobA,
        userId: userA,
        type: 'GENERATE_BOOK',
        status: 'COMPLETED',
        attempts: 1,
        maxAttempts: 2,
        payload: { bookId: bookA },
        result: null,
        errorMessage: null,
        queuedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      });
      mockQueue.getJob.mockResolvedValue(null);

      const result = await service.getGenerationJob(userA, jobA);

      expect(result.id).toBe(jobA);
      expect(prisma.job.findFirst).toHaveBeenCalledWith({
        where: { id: jobA, userId: userA, type: 'GENERATE_BOOK' },
      });
    });
  });

  describe('listBooks — isolation', () => {
    it('only returns books for the requesting user', async () => {
      prisma.book.findMany.mockResolvedValue([]);

      await service.listBooks(userA);

      expect(prisma.book.findMany).toHaveBeenCalledWith({
        where: { userId: userA },
        include: {
          child: { select: { id: true, name: true } },
          template: { select: { id: true, slug: true, title: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
      });
    });

    it('does not return books for userB when listing for userA', async () => {
      prisma.book.findMany.mockResolvedValue([]);

      await service.listBooks(userA);

      const calledWith = prisma.book.findMany.mock.calls[0]![0] as {
        where: { userId: string };
      };
      expect(calledWith.where.userId).toBe(userA);
      expect(calledWith.where.userId).not.toBe(userB);
    });
  });

  describe('getBookProgress — cross-user access', () => {
    it('rejects progress check for a book owned by another user', async () => {
      prisma.book.findFirst.mockResolvedValue(null);

      await expect(
        service.getBookProgress(userB, bookA),
      ).rejects.toThrow(NotFoundException);
    });
  });
});