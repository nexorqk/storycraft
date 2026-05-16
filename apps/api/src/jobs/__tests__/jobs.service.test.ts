import { Test, TestingModule } from '@nestjs/testing';

import { JobsService } from '../jobs.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  job: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  book: {
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  describe('createGenerationJob', () => {
    it('creates a GENERATE_BOOK job with correct defaults', async () => {
      const mockJob = {
        id: 'job-1',
        type: 'GENERATE_BOOK',
        status: 'QUEUED',
        userId: 'user-1',
        bookId: 'book-1',
        maxAttempts: 2,
        payload: { bookId: 'book-1', trigger: 'create-book' },
      };
      mockPrismaService.job.create.mockResolvedValue(mockJob);

      const result = await service.createGenerationJob({
        userId: 'user-1',
        bookId: 'book-1',
        trigger: 'create-book',
      });

      expect(result).toEqual(mockJob);
      expect(mockPrismaService.job.create).toHaveBeenCalledWith({
        data: {
          type: 'GENERATE_BOOK',
          status: 'QUEUED',
          userId: 'user-1',
          bookId: 'book-1',
          maxAttempts: 2,
          payload: { bookId: 'book-1', trigger: 'create-book' },
        },
      });
    });

    it('respects custom maxAttempts', async () => {
      mockPrismaService.job.create.mockResolvedValue({ id: 'job-1' });

      await service.createGenerationJob({
        userId: 'user-1',
        bookId: 'book-1',
        trigger: 'manual-retry',
        maxAttempts: 5,
      });

      expect(mockPrismaService.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ maxAttempts: 5 }),
        }),
      );
    });
  });

  describe('markQueueingFailed', () => {
    it('marks both job and book as FAILED in a transaction', async () => {
      mockPrismaService.$transaction.mockImplementation(
        async (arg: unknown) => {
          if (typeof arg === 'function') {
            return arg(mockPrismaService);
          }
          return Promise.all(arg as Promise<unknown>[]);
        },
      );
      mockPrismaService.job.update.mockResolvedValue({ id: 'job-1' });
      mockPrismaService.book.update.mockResolvedValue({ id: 'book-1' });

      await service.markQueueingFailed('job-1', 'book-1', 'Queue error');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.job.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Queue error',
        }),
      });
      expect(mockPrismaService.book.update).toHaveBeenCalledWith({
        where: { id: 'book-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Queue error',
        }),
      });
    });
  });

  describe('findLatestGenerationJob', () => {
    it('queries by bookId ordered by queuedAt desc', async () => {
      const mockJob = { id: 'job-latest' };
      mockPrismaService.job.findFirst.mockResolvedValue(mockJob);

      const result = await service.findLatestGenerationJob('book-1');

      expect(result).toEqual(mockJob);
      expect(mockPrismaService.job.findFirst).toHaveBeenCalledWith({
        where: { bookId: 'book-1', type: 'GENERATE_BOOK' },
        orderBy: { queuedAt: 'desc' },
      });
    });
  });

  describe('findGenerationJobForUser', () => {
    it('queries by jobId and userId', async () => {
      const mockJob = { id: 'job-1', userId: 'user-1' };
      mockPrismaService.job.findFirst.mockResolvedValue(mockJob);

      const result = await service.findGenerationJobForUser('user-1', 'job-1');

      expect(result).toEqual(mockJob);
      expect(mockPrismaService.job.findFirst).toHaveBeenCalledWith({
        where: { id: 'job-1', userId: 'user-1', type: 'GENERATE_BOOK' },
      });
    });
  });

  describe('listJobsForBook', () => {
    it('returns jobs for a book ordered by queuedAt desc', async () => {
      const mockJobs = [
        {
          id: 'job-2',
          type: 'GENERATE_BOOK',
          status: 'COMPLETED',
          bookId: 'book-1',
          attempts: 1,
          maxAttempts: 2,
          payload: {},
          result: null,
          errorMessage: null,
          queuedAt: new Date('2026-05-16'),
          startedAt: null,
          completedAt: new Date('2026-05-16'),
        },
        {
          id: 'job-1',
          type: 'GENERATE_BOOK',
          status: 'FAILED',
          bookId: 'book-1',
          attempts: 2,
          maxAttempts: 2,
          payload: {},
          result: null,
          errorMessage: 'error',
          queuedAt: new Date('2026-05-15'),
          startedAt: new Date('2026-05-15'),
          completedAt: new Date('2026-05-15'),
        },
      ];
      mockPrismaService.job.findMany.mockResolvedValue(mockJobs);

      const result = await service.listJobsForBook('book-1');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.job.findMany).toHaveBeenCalledWith({
        where: { bookId: 'book-1' },
        orderBy: { queuedAt: 'desc' },
      });
    });
  });

  describe('toPublicJob', () => {
    it('maps a persistent job to a public job', () => {
      const job = {
        id: 'job-1',
        type: 'GENERATE_BOOK',
        status: 'COMPLETED',
        bookId: 'book-1',
        attempts: 1,
        maxAttempts: 2,
        payload: { bookId: 'book-1' },
        result: { progress: 100 },
        errorMessage: null,
        queuedAt: new Date('2026-05-15T10:00:00.000Z'),
        startedAt: new Date('2026-05-15T10:00:05.000Z'),
        completedAt: new Date('2026-05-15T10:05:00.000Z'),
      };

      const result = service.toPublicJob(job as any);

      expect(result.id).toBe('job-1');
      expect(result.status).toBe('completed');
      expect(result.queuedAt).toBe('2026-05-15T10:00:00.000Z');
      expect(result.startedAt).toBe('2026-05-15T10:00:05.000Z');
      expect(result.completedAt).toBe('2026-05-15T10:05:00.000Z');
    });
  });
});
