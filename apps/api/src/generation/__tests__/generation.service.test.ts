import { Test, TestingModule } from '@nestjs/testing';

import { GenerationService } from '../generation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TemplateRendererService } from '../../templates/template-renderer.service';
import { TemplateVariablesService } from '../../templates/template-variables.service';

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
    deleteMany: jest.fn(),
  },
};

const mockBook = {
  id: 'book-1',
  childNameInStory: null,
  personalization: {
    favoriteToy: ' плюшевого динозавра ',
    setting: 'звёздный сад',
  },
  child: {
    id: 'child-1',
    name: 'Маша',
    birthDate: new Date('2020-01-01'),
    interests: ['космос', 'динозавры'],
    readingLevel: 'beginner',
  },
  template: {
    id: 'template-1',
    pages: [
      {
        id: 'template-page-1',
        pageNumber: 1,
        textPrompt: 'Legacy prompt',
        illustrationPrompt: 'Legacy illustration prompt',
        baseText:
          '{childName} взял {favoriteToy} и пошёл в {setting}. Любимое занятие: {mainInterest}.',
        illustrationPromptBase: 'Star prompt',
      },
    ],
  },
};

describe('GenerationService', () => {
  let service: GenerationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.bookPage.findMany.mockResolvedValue([]);
    mockPrismaService.bookPage.create.mockResolvedValue({ id: 'book-page-1' });
    mockPrismaService.book.update.mockResolvedValue({});
    mockPrismaService.illustration.deleteMany.mockResolvedValue({ count: 0 });
    mockPrismaService.bookPage.deleteMany.mockResolvedValue({ count: 0 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationService,
        TemplateRendererService,
        TemplateVariablesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GenerationService>(GenerationService);
  });

  it('creates book pages from template baseText without AI providers', async () => {
    mockPrismaService.book.findUnique.mockResolvedValue(mockBook);

    await service.generateBook('book-1');

    expect(mockPrismaService.bookPage.create).toHaveBeenCalledWith({
      data: {
        bookId: 'book-1',
        templatePageId: 'template-page-1',
        pageNumber: 1,
        text: 'Маша взял плюшевого динозавра и пошёл в звёздный сад. Любимое занятие: космос.',
        illustrationPrompt: 'Star prompt',
      },
    });
  });

  it('marks the book completed without generating a PDF', async () => {
    const mockPdfService = { generateBookPdf: jest.fn() };
    mockPrismaService.book.findUnique.mockResolvedValue(mockBook);

    await service.generateBook('book-1');

    expect(mockPdfService.generateBookPdf).not.toHaveBeenCalled();
    expect(mockPrismaService.book.update).toHaveBeenCalledWith({
      where: { id: 'book-1' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        errorMessage: null,
        pdfObjectKey: null,
      }),
    });
  });

  it('cleans partial book page records before retry', async () => {
    mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
    mockPrismaService.bookPage.findMany.mockResolvedValue([
      { id: 'old-page-1' },
      { id: 'old-page-2' },
    ]);

    await service.generateBook('book-1');

    expect(mockPrismaService.illustration.deleteMany).toHaveBeenCalledWith({
      where: { pageId: { in: ['old-page-1', 'old-page-2'] } },
    });
    expect(mockPrismaService.bookPage.deleteMany).toHaveBeenCalledWith({
      where: { bookId: 'book-1' },
    });
  });

  it('uses legacy textPrompt as a migration fallback when baseText is empty', async () => {
    mockPrismaService.book.findUnique.mockResolvedValue({
      ...mockBook,
      template: {
        ...mockBook.template,
        pages: [
          {
            ...mockBook.template.pages[0],
            baseText: '',
            textPrompt: 'Привет, {childName}!',
            illustrationPromptBase: null,
          },
        ],
      },
    });

    await service.generateBook('book-1');

    expect(mockPrismaService.bookPage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        text: 'Привет, Маша!',
        illustrationPrompt: null,
      }),
    });
  });

  it('calls progress callback after each rendered page', async () => {
    mockPrismaService.book.findUnique.mockResolvedValue({
      ...mockBook,
      template: {
        ...mockBook.template,
        pages: [
          mockBook.template.pages[0],
          {
            ...mockBook.template.pages[0],
            id: 'template-page-2',
            pageNumber: 2,
            baseText: 'Страница два для {childName}.',
          },
        ],
      },
    });

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

  it('marks book as failed when rendering fails', async () => {
    mockPrismaService.book.findUnique.mockResolvedValue(mockBook);
    mockPrismaService.bookPage.create.mockRejectedValue(new Error('DB error'));

    await expect(service.generateBook('book-1')).rejects.toThrow('DB error');

    expect(mockPrismaService.book.update).toHaveBeenCalledWith({
      where: { id: 'book-1' },
      data: expect.objectContaining({
        status: 'FAILED',
        errorMessage: 'DB error',
      }),
    });
  });

  it('throws error when book not found', async () => {
    mockPrismaService.book.findUnique.mockResolvedValue(null);

    await expect(service.generateBook('missing-book')).rejects.toThrow(
      'Book missing-book not found',
    );
  });
});
