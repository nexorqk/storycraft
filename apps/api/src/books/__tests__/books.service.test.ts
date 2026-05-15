import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';

import { BooksService } from '../books.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GENERATION_QUEUE } from '../../queues/generation-queue.constants';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  book: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  child: {
    findFirst: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: getQueueToken(GENERATION_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
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
        freeGenerationsUsed: 1,
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
      mockPrismaService.user.update.mockResolvedValue({});
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const result = await service.createBook('user-1', dto);

      expect(result.id).toBe('book-1');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { freeGenerationsUsed: { increment: 1 } },
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'generate-book',
        { bookId: 'book-1' },
        {
          jobId: 'book-book-1',
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
    });

    it('throws BadRequestException when free plan limit is reached', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        freeGenerationsUsed: 3,
      });

      await expect(service.createBook('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockPrismaService.child.findFirst).not.toHaveBeenCalled();
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
        freeGenerationsUsed: 0,
      });
      mockPrismaService.child.findFirst.mockResolvedValue(null);

      await expect(service.createBook('user-1', dto)).rejects.toThrow(
        'Child profile not found',
      );
    });

    it('throws NotFoundException when template not found or inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        freeGenerationsUsed: 0,
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
        freeGenerationsUsed: 0,
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
      mockPrismaService.user.update.mockResolvedValue({});
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
  });

  describe('getUsage', () => {
    it('returns usage stats for a user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        freeGenerationsUsed: 2,
      });

      const result = await service.getUsage('user-1');

      expect(result).toEqual({
        used: 2,
        limit: 3,
        remaining: 1,
      });
    });

    it('returns zero remaining when limit is reached', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        freeGenerationsUsed: 5,
      });

      const result = await service.getUsage('user-1');

      expect(result.remaining).toBe(0);
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
