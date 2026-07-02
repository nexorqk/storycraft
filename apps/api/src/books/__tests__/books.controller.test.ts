import { BooksController } from '../books.controller';

const mockBooks = {
  getBook: jest.fn(),
};

const mockStorage = {
  getSignedDownloadUrl: jest.fn(),
};

describe('BooksController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates illustration URLs concurrently and skips missing objects', async () => {
    mockBooks.getBook.mockResolvedValue({
      illustrations: [
        { id: 'illustration-1', objectKey: 'books/book-1/page-1.png' },
        { id: 'illustration-2', objectKey: 'books/book-1/page-2.png' },
        { id: 'illustration-3', objectKey: null },
      ],
    });
    const resolvers: Array<() => void> = [];
    mockStorage.getSignedDownloadUrl.mockImplementation(
      (key: string) =>
        new Promise<string>((resolve) => {
          resolvers.push(() => resolve(`signed:${key}`));
        }),
    );
    const controller = new BooksController(
      mockBooks as never,
      mockStorage as never,
    );

    const resultPromise = controller.getIllustrationUrls(
      { id: 'user-1' } as never,
      'book-1',
    );
    await Promise.resolve();

    expect(mockStorage.getSignedDownloadUrl).toHaveBeenCalledTimes(2);
    expect(mockStorage.getSignedDownloadUrl).toHaveBeenNthCalledWith(
      1,
      'books/book-1/page-1.png',
      86400,
    );
    expect(mockStorage.getSignedDownloadUrl).toHaveBeenNthCalledWith(
      2,
      'books/book-1/page-2.png',
      86400,
    );

    resolvers.forEach((resolve) => resolve());
    await expect(resultPromise).resolves.toEqual({
      urls: {
        'illustration-1': 'signed:books/book-1/page-1.png',
        'illustration-2': 'signed:books/book-1/page-2.png',
      },
    });
  });
});
