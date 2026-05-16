import { Test, TestingModule } from '@nestjs/testing';

import { GenerationService } from '../generation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { PdfService } from '../../pdf/pdf.service';
import type { StoryProvider } from '../types';
import type { IllustrationProvider } from '../illustration-types';

const mockPrismaService = {
  book: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  bookPage: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  illustration: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  child: {
    findUnique: jest.fn(),
  },
  template: {
    findUnique: jest.fn(),
  },
};

const mockStoryProvider = {
  generatePage: jest.fn() as jest.Mock,
};

const mockIllustrationProvider = {
  generate: jest.fn() as jest.Mock,
};

const mockStorageService = {
  buildKey: jest.fn(),
  uploadFile: jest.fn(),
};

const mockPdfService = {
  generateBookPdf: jest.fn(),
};

const mockBook = {
  id: 'book-1',
  childNameInStory: null,
  coverStyle: 'default',
  child: {
    id: 'child-1',
    name: 'Masha',
    birthDate: new Date('2020-01-01'),
    interests: ['dinosaurs', 'space'],
  },
  template: {
    id: 'template-1',
    storyPrompt: 'A magical adventure',
    illustrationStylePrompt: 'watercolor style',
    pages: [
      {
        id: 'page-1',
        pageNumber: 1,
        textPrompt: 'Once upon a time',
        illustrationPrompt: 'A forest scene',
      },
    ],
  },
};

describe('GenerationService', () => {
  let service: GenerationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: 'STORY_PROVIDER', useValue: mockStoryProvider },
        { provide: 'ILLUSTRATION_PROVIDER', useValue: mockIllustrationProvider },
        { provide: StorageService, useValue: mockStorageService },
        { provide: PdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<GenerationService>(GenerationService);
  });

  describe('generateBook', () => {
    it('generates text and illustrations for each page', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockStoryProvider.generatePage.mockResolvedValue({
        text: 'Generated story text',
        illustrationPrompt: 'Generated illustration prompt',
      });
      mockPrismaService.bookPage.create.mockResolvedValue({
        id: 'book-page-1',
      });
      mockPrismaService.bookPage.findMany.mockResolvedValue([]);
      mockIllustrationProvider.generate.mockResolvedValue({
        buffer: Buffer.from('image-data'),
        mimeType: 'image/png',
      });
      mockStorageService.buildKey.mockReturnValue(
        'illustrations/book-1/1.png',
      );
      mockStorageService.uploadFile.mockResolvedValue(undefined);
      mockPrismaService.illustration.create.mockResolvedValue({ id: 'ill-1' });
      mockPdfService.generateBookPdf.mockResolvedValue('books/book-1/book.pdf');
      mockPrismaService.book.update.mockResolvedValue({});

      await service.generateBook('book-1');

      expect(mockStoryProvider.generatePage).toHaveBeenCalledWith(
        expect.objectContaining({
          childName: 'Masha',
          pageNumber: 1,
          pageTextPrompt: 'Once upon a time',
        }),
      );

      expect(mockIllustrationProvider.generate).toHaveBeenCalledWith({
        prompt: 'Generated illustration prompt',
        bookId: 'book-1',
        pageNumber: 1,
      });

      expect(mockPrismaService.bookPage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookId: 'book-1',
          text: 'Generated story text',
          illustrationPrompt: 'Generated illustration prompt',
        }),
      });

      expect(mockPrismaService.illustration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookId: 'book-1',
          status: 'COMPLETED',
          provider: 'dall-e',
        }),
      });
    });

    it('marks book as COMPLETED and generates PDF on success', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaService.bookPage.findMany.mockResolvedValue([]);
      mockStoryProvider.generatePage.mockResolvedValue({
        text: 'Story',
        illustrationPrompt: 'Prompt',
      });
      mockPrismaService.bookPage.create.mockResolvedValue({ id: 'bp-1' });
      mockIllustrationProvider.generate.mockResolvedValue({
        buffer: Buffer.from('img'),
        mimeType: 'image/png',
      });
      mockStorageService.buildKey.mockReturnValue('illustrations/book-1/1.png');
      mockStorageService.uploadFile.mockResolvedValue(undefined);
      mockPrismaService.illustration.create.mockResolvedValue({ id: 'ill-1' });
      mockPdfService.generateBookPdf.mockResolvedValue('books/book-1/book.pdf');
      mockPrismaService.book.update.mockResolvedValue({});

      await service.generateBook('book-1');

      expect(mockPdfService.generateBookPdf).toHaveBeenCalledWith('book-1');
      expect(mockPrismaService.book.update).toHaveBeenCalledWith({
        where: { id: 'book-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          pdfObjectKey: 'books/book-1/book.pdf',
        }),
      });
    });

    it('uses childNameInStory when set, falling back to child name', async () => {
      const bookWithCustomName = {
        ...mockBook,
        childNameInStory: 'Саша',
        coverStyle: 'cartoon',
      };

      mockPrismaService.book.findUnique.mockResolvedValue(bookWithCustomName);
      mockPrismaService.bookPage.findMany.mockResolvedValue([]);
      mockStoryProvider.generatePage.mockResolvedValue({
        text: 'Story text',
        illustrationPrompt: 'Illustration prompt',
      });
      mockPrismaService.bookPage.create.mockResolvedValue({ id: 'bp-1' });
      mockIllustrationProvider.generate.mockResolvedValue({
        buffer: Buffer.from('img'),
        mimeType: 'image/png',
      });
      mockStorageService.buildKey.mockReturnValue('illustrations/book-1/1.png');
      mockStorageService.uploadFile.mockResolvedValue(undefined);
      mockPrismaService.illustration.create.mockResolvedValue({ id: 'ill-1' });
      mockPdfService.generateBookPdf.mockResolvedValue('books/book-1/book.pdf');
      mockPrismaService.book.update.mockResolvedValue({});

      await service.generateBook('book-1');

      expect(mockStoryProvider.generatePage).toHaveBeenCalledWith(
        expect.objectContaining({
          childName: 'Саша',
          coverStyle: 'cartoon',
        }),
      );
    });

    it('uses child name when childNameInStory is null', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaService.bookPage.findMany.mockResolvedValue([]);
      mockStoryProvider.generatePage.mockResolvedValue({
        text: 'Story',
        illustrationPrompt: 'Prompt',
      });
      mockPrismaService.bookPage.create.mockResolvedValue({ id: 'bp-1' });
      mockIllustrationProvider.generate.mockResolvedValue({
        buffer: Buffer.from('img'),
        mimeType: 'image/png',
      });
      mockStorageService.buildKey.mockReturnValue('illustrations/book-1/1.png');
      mockStorageService.uploadFile.mockResolvedValue(undefined);
      mockPrismaService.illustration.create.mockResolvedValue({ id: 'ill-1' });
      mockPdfService.generateBookPdf.mockResolvedValue('books/book-1/book.pdf');
      mockPrismaService.book.update.mockResolvedValue({});

      await service.generateBook('book-1');

      expect(mockStoryProvider.generatePage).toHaveBeenCalledWith(
        expect.objectContaining({
          childName: 'Masha',
          coverStyle: 'default',
        }),
      );
    });

    it('marks book as FAILED on error', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaService.bookPage.findMany.mockResolvedValue([]);
      mockStoryProvider.generatePage.mockRejectedValue(
        new Error('AI provider error'),
      );
      mockPrismaService.book.update.mockResolvedValue({});

      await expect(service.generateBook('book-1')).rejects.toThrow(
        'AI provider error',
      );

      expect(mockPrismaService.book.update).toHaveBeenCalledWith({
        where: { id: 'book-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'AI provider error',
        }),
      });
    });

    it('throws error when book not found', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(null);

      await expect(service.generateBook('nonexistent')).rejects.toThrow(
        'Book nonexistent not found',
      );
    });

    it('calls progress callback after each page', async () => {
      const bookWithTwoPages = {
        ...mockBook,
        template: {
          ...mockBook.template,
          pages: [
            {
              id: 'page-1',
              pageNumber: 1,
              textPrompt: 'Page 1',
              illustrationPrompt: 'Ill 1',
            },
            {
              id: 'page-2',
              pageNumber: 2,
              textPrompt: 'Page 2',
              illustrationPrompt: 'Ill 2',
            },
          ],
        },
      };

      mockPrismaService.book.findUnique.mockResolvedValue(bookWithTwoPages);
      mockPrismaService.bookPage.findMany.mockResolvedValue([]);
      mockStoryProvider.generatePage.mockResolvedValue({
        text: 'Story',
        illustrationPrompt: 'Prompt',
      });
      mockPrismaService.bookPage.create.mockResolvedValue({ id: 'bp-1' });
      mockIllustrationProvider.generate.mockResolvedValue({
        buffer: Buffer.from('img'),
        mimeType: 'image/png',
      });
      mockStorageService.buildKey.mockReturnValue(
        'illustrations/book-1/1.png',
      );
      mockStorageService.uploadFile.mockResolvedValue(undefined);
      mockPrismaService.illustration.create.mockResolvedValue({ id: 'ill-1' });
      mockPdfService.generateBookPdf.mockResolvedValue('books/book-1/book.pdf');
      mockPrismaService.book.update.mockResolvedValue({});

      const progressCalls: [number, number][] = [];
      const progressCallback = async (completed: number, total: number) => {
        progressCalls.push([completed, total]);
      };

      await service.generateBook('book-1', progressCallback);

      expect(progressCalls).toEqual([
        [1, 2],
        [2, 2],
      ]);
    });
  });

  describe('calculateAge', () => {
    it('calculates age correctly', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 5);

      const book = {
        id: 'book-1',
        child: {
          id: 'child-1',
          name: 'Masha',
          birthDate,
          interests: [],
        },
        template: {
          ...mockBook.template,
          pages: [],
        },
      };

      mockPrismaService.book.findUnique.mockResolvedValue(book);
      mockPrismaService.bookPage.findMany.mockResolvedValue([]);
      mockPdfService.generateBookPdf.mockResolvedValue('books/book-1/book.pdf');
      mockPrismaService.book.update.mockResolvedValue({});

      expect(async () => {
        await service.generateBook('book-1');
      }).not.toThrow();
    });
  });
});
