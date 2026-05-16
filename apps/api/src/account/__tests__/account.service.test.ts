import { AccountService } from '../account.service';

const mockPrisma = {
  $transaction: jest.fn(),
  user: {
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  book: {
    findMany: jest.fn(),
  },
  authSession: {
    updateMany: jest.fn(),
  },
};

const mockStorage = {
  deleteFiles: jest.fn(),
};

describe('AccountService', () => {
  let service: AccountService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new AccountService(mockPrisma as never, mockStorage as never);
  });

  it('exports account-owned data', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      avatarUrl: null,
      locale: 'ru',
      freeGenerationsUsed: 1,
      freeGenerationsPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      createdAt: new Date('2026-05-02T00:00:00.000Z'),
      updatedAt: new Date('2026-05-03T00:00:00.000Z'),
      children: [],
      books: [],
      ratings: [],
      subscriptions: [],
      paymentCustomers: [],
      referrals: [],
      referredBy: [],
    });

    const result = await service.exportAccountData('user-1');

    expect(result.user.email).toBe('user@example.com');
    expect(result.children).toEqual([]);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    );
  });

  it('deletes storage objects before deleting the user', async () => {
    mockPrisma.book.findMany.mockResolvedValue([
      {
        pdfObjectKey: 'books/book-1/book.pdf',
        illustrations: [
          { objectKey: 'illustrations/book-1/1.png' },
          { objectKey: null },
        ],
      },
    ]);
    mockStorage.deleteFiles.mockResolvedValue(undefined);
    mockPrisma.authSession.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.delete.mockResolvedValue({});

    await service.deleteAccount('user-1');

    expect(mockStorage.deleteFiles).toHaveBeenCalledWith([
      'books/book-1/book.pdf',
      'illustrations/book-1/1.png',
    ]);
    expect(mockPrisma.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
  });
});
