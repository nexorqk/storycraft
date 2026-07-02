import { AdminDashboardController } from '../admin-dashboard.controller';

const mockPrisma = {
  user: {
    count: jest.fn(),
  },
  book: {
    groupBy: jest.fn(),
  },
  template: {
    groupBy: jest.fn(),
  },
  job: {
    groupBy: jest.fn(),
  },
};

describe('AdminDashboardController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all counters using four aggregate database operations', async () => {
    mockPrisma.user.count.mockResolvedValue(12);
    mockPrisma.book.groupBy.mockResolvedValue([
      { status: 'PENDING', _count: { _all: 2 } },
      { status: 'COMPLETED', _count: { _all: 7 } },
      { status: 'FAILED', _count: { _all: 1 } },
    ]);
    mockPrisma.template.groupBy.mockResolvedValue([
      { isActive: true, _count: { _all: 4 } },
      { isActive: false, _count: { _all: 2 } },
    ]);
    mockPrisma.job.groupBy.mockResolvedValue([
      { status: 'QUEUED', _count: { _all: 3 } },
      { status: 'FAILED', _count: { _all: 5 } },
    ]);
    const controller = new AdminDashboardController(mockPrisma as never);

    await expect(controller.getDashboard()).resolves.toEqual({
      users: 12,
      books: 10,
      templates: 6,
      activeTemplates: 4,
      pendingJobs: 3,
      failedJobs: 5,
      completedBooks: 7,
      failedBooks: 1,
    });
    expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.book.groupBy).toHaveBeenCalledTimes(1);
    expect(mockPrisma.template.groupBy).toHaveBeenCalledTimes(1);
    expect(mockPrisma.job.groupBy).toHaveBeenCalledTimes(1);
  });

  it('returns zero when a requested status has no records', async () => {
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.book.groupBy.mockResolvedValue([]);
    mockPrisma.template.groupBy.mockResolvedValue([]);
    mockPrisma.job.groupBy.mockResolvedValue([]);
    const controller = new AdminDashboardController(mockPrisma as never);

    await expect(controller.getDashboard()).resolves.toEqual({
      users: 0,
      books: 0,
      templates: 0,
      activeTemplates: 0,
      pendingJobs: 0,
      failedJobs: 0,
      completedBooks: 0,
      failedBooks: 0,
    });
  });
});
