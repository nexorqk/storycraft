import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';

import { BooksService } from '../books.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GENERATION_QUEUE } from '../../queues/generation-queue.constants';

const mockPrismaService = {
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
  bookPage: {
    deleteMany: jest.fn(),
  },
  child: {
    findFirst: jest.fn(),
  },
  illustration: {
    deleteMany: jest.fn(),
  },
  job: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  template: {
    findFirst: jest.fn(),
  },
};

const mockQueue = {
  add: jest.fn(),
  getJob: jest.fn(),
};

describe('BooksService', () => {
  let service: BooksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.$queryRaw.mockResolvedValue([
      {
        freeGenerationsUsed: 1,
        freeGenerationsPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      },
    ]);
    mockPrismaService.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof mockPrismaService) => unknown)(
          mockPrismaService,
        );
      }

      return Promise.all(arg as Promise<unknown>[]);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: getQueueToken(GENERATION_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('listBooks', () => {
    it('returns books for a user', async () => {
      const mockBooks = [
        {
          id: 'book-1',
          title: 'Test Book',
          language: 'ru',
          status: 'COMPLETED',
          pdfObjectKey: 'books/book-1/book.pdf',
          errorMessage: null,
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          child: { id: 'child-1', name: 'Masha' },
          template: { id: 'template-1', slug: 'adventure', title: 'Adventure' },
        },
      ];

      mockPrismaService.book.findMany.mockResolvedValue(mockBooks);

      const result = await service.listBooks('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('book-1');
      expect(result[0]!.child.name).toBe('Masha');
      expect(mockPrismaService.book.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: {
          child: { select: { id: true, name: true } },
          template: { select: { id: true, slug: true, title: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
      });
    });

    it('returns empty array when no books exist', async () => {
      mockPrismaService.book.findMany.mockResolvedValue([]);

      const result = await service.listBooks('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('createBook', () => {
    const dto = {
      childId: 'child-1',
      templateId: 'template-1',
      title: 'My Book',
      language: 'ru',
    };

    it('creates a book and enqueues generation when under limit', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
      });
      mockPrismaService.child.findFirst.mockResolvedValue({
        id: 'child-1',
        name: 'Masha',
      });
      mockPrismaService.template.findFirst.mockResolvedValue({
        id: 'template-1',
        title: 'Adventure',
        isActive: true,
      });
      mockPrismaService.book.create.mockResolvedValue({
        id: 'book-1',
        title: 'My Book',
        language: 'ru',
        status: 'PENDING',
        pdfObjectKey: null,
        errorMessage: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        child: { id: 'child-1', name: 'Masha' },
        template: { id: 'template-1', slug: 'adventure', title: 'Adventure' },
      });
      mockPrismaService.job.create.mockResolvedValue({
        id: 'persistent-job-1',
      });
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const result = await service.createBook('user-1', dto);

      expect(result.id).toBe('book-1');
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.job.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'GENERATE_BOOK',
          status: 'QUEUED',
          userId: 'user-1',
          bookId: 'book-1',
        }),
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'generate-book',
        { bookId: 'book-1', persistentJobId: 'persistent-job-1' },
        {
          jobId: 'persistent-job-1',
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
    });

    it('throws BadRequestException when free plan limit is reached', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
      });
      mockPrismaService.child.findFirst.mockResolvedValue({
        id: 'child-1',
        name: 'Masha',
      });
      mockPrismaService.template.findFirst.mockResolvedValue({
        id: 'template-1',
        isActive: true,
      });
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await expect(service.createBook('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockPrismaService.book.create).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.createBook('user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when child not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
      });
      mockPrismaService.child.findFirst.mockResolvedValue(null);

      await expect(service.createBook('user-1', dto)).rejects.toThrow(
        'Child profile not found',
      );
    });

    it('throws NotFoundException when template not found or inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
      });
      mockPrismaService.child.findFirst.mockResolvedValue({
        id: 'child-1',
        name: 'Masha',
      });
      mockPrismaService.template.findFirst.mockResolvedValue(null);

      await expect(service.createBook('user-1', dto)).rejects.toThrow(
        'Template not found or inactive',
      );
    });

    it('trims title and defaults language to ru', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
      });
      mockPrismaService.child.findFirst.mockResolvedValue({
        id: 'child-1',
        name: 'Masha',
      });
      mockPrismaService.template.findFirst.mockResolvedValue({
        id: 'template-1',
        isActive: true,
      });
      mockPrismaService.book.create.mockResolvedValue({
        id: 'book-1',
        title: 'Trimmed',
        language: 'ru',
        status: 'PENDING',
        pdfObjectKey: null,
        errorMessage: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        child: { id: 'child-1', name: 'Masha' },
        template: { id: 'template-1', slug: 'adventure', title: 'Adventure' },
      });
      mockPrismaService.job.create.mockResolvedValue({
        id: 'persistent-job-1',
      });
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.createBook('user-1', {
        ...dto,
        title: '  Trimmed  ',
      });

      expect(mockPrismaService.book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Trimmed',
            language: 'ru',
          }),
        }),
      );
    });

    it('uses an atomic monthly usage update for concurrent generation requests', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-15T12:00:00.000Z'));
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
      });
      mockPrismaService.child.findFirst.mockResolvedValue({
        id: 'child-1',
        name: 'Masha',
      });
      mockPrismaService.template.findFirst.mockResolvedValue({
        id: 'template-1',
        isActive: true,
      });
      mockPrismaService.book.create.mockResolvedValue({
        id: 'book-1',
        title: 'My Book',
        language: 'ru',
        status: 'PENDING',
        pdfObjectKey: null,
        errorMessage: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        child: { id: 'child-1', name: 'Masha' },
        template: { id: 'template-1', slug: 'adventure', title: 'Adventure' },
      });
      mockPrismaService.job.create.mockResolvedValue({
        id: 'persistent-job-1',
      });
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.createBook('user-1', dto);

      const firstCall = mockPrismaService.$queryRaw.mock.calls[0]!;
      const sql = (firstCall[0] as TemplateStringsArray).join('?');

      expect(sql).toContain('UPDATE "User"');
      expect(sql).toContain('"freeGenerationsPeriodStart" <');
      expect(sql).toContain('"freeGenerationsUsed" <');
      expect(firstCall).toContainEqual(new Date('2026-05-01T00:00:00.000Z'));
      expect(firstCall).toContain(3);

      jest.useRealTimers();
    });
  });

  describe('triggerGeneration', () => {
    it('retries generation only for a book owned by the user', async () => {
      mockPrismaService.book.findFirst.mockResolvedValue({
        id: 'book-1',
        status: 'FAILED',
      });
      mockPrismaService.book.update.mockResolvedValue({});
      mockPrismaService.illustration.deleteMany.mockResolvedValue({});
      mockPrismaService.bookPage.deleteMany.mockResolvedValue({});
      mockPrismaService.job.create.mockResolvedValue({
        id: 'persistent-job-2',
      });
      mockQueue.add.mockResolvedValue({ id: 'persistent-job-2' });

      const result = await service.triggerGeneration('user-1', 'book-1');

      expect(result).toEqual({
        bookId: 'book-1',
        jobId: 'persistent-job-2',
        status: 'queued',
      });
      expect(mockPrismaService.book.findFirst).toHaveBeenCalledWith({
        where: { id: 'book-1', userId: 'user-1' },
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'generate-book',
        { bookId: 'book-1', persistentJobId: 'persistent-job-2' },
        expect.objectContaining({ jobId: 'persistent-job-2' }),
      );
    });

    it('does not enqueue generation when the user does not own the book', async () => {
      mockPrismaService.book.findFirst.mockResolvedValue(null);

      await expect(
        service.triggerGeneration('user-1', 'book-1'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.job.create).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('getUsage', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-15T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns usage stats for a user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        freeGenerationsUsed: 2,
        freeGenerationsPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      });

      const result = await service.getUsage('user-1');

      expect(result).toEqual({
        used: 2,
        limit: 3,
        remaining: 1,
        periodStart: '2026-05-01T00:00:00.000Z',
        periodEnd: '2026-06-01T00:00:00.000Z',
      });
    });

    it('returns zero remaining when limit is reached', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        freeGenerationsUsed: 5,
        freeGenerationsPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      });

      const result = await service.getUsage('user-1');

      expect(result.remaining).toBe(0);
    });

    it('resets usage when the stored period is from a previous month', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        freeGenerationsUsed: 3,
        freeGenerationsPeriodStart: new Date('2026-04-01T00:00:00.000Z'),
      });
      mockPrismaService.user.update.mockResolvedValue({
        freeGenerationsUsed: 0,
        freeGenerationsPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      });

      const result = await service.getUsage('user-1');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          freeGenerationsUsed: 0,
          freeGenerationsPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
        },
        select: {
          freeGenerationsUsed: true,
          freeGenerationsPeriodStart: true,
        },
      });
      expect(result).toEqual({
        used: 0,
        limit: 3,
        remaining: 3,
        periodStart: '2026-05-01T00:00:00.000Z',
        periodEnd: '2026-06-01T00:00:00.000Z',
      });
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUsage('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteBook', () => {
    it('deletes a book owned by the user', async () => {
      mockPrismaService.book.findFirst.mockResolvedValue({ id: 'book-1' });
      mockPrismaService.book.delete.mockResolvedValue({});

      await service.deleteBook('user-1', 'book-1');

      expect(mockPrismaService.book.delete).toHaveBeenCalledWith({
        where: { id: 'book-1' },
      });
    });

    it('throws NotFoundException when book not owned by user', async () => {
      mockPrismaService.book.findFirst.mockResolvedValue(null);

      await expect(service.deleteBook('user-1', 'book-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBook', () => {
    it('throws NotFoundException when book not owned', async () => {
      mockPrismaService.book.findFirst.mockResolvedValue(null);

      await expect(service.getBook('user-1', 'book-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
