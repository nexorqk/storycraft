import { Controller, Get, UseGuards } from '@nestjs/common';

import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/dashboard')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getDashboard() {
    const [users, booksByStatus, templatesByActivity, jobsByStatus] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.book.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        this.prisma.template.groupBy({
          by: ['isActive'],
          _count: { _all: true },
        }),
        this.prisma.job.groupBy({
          by: ['status'],
          where: { status: { in: ['QUEUED', 'FAILED'] } },
          _count: { _all: true },
        }),
      ]);

    const books = booksByStatus.reduce(
      (total, group) => total + group['_count']['_all'],
      0,
    );
    const completedBooks =
      booksByStatus.find((group) => group.status === 'COMPLETED')?.['_count'][
        '_all'
      ] ?? 0;
    const failedBooks =
      booksByStatus.find((group) => group.status === 'FAILED')?.['_count'][
        '_all'
      ] ?? 0;
    const templates = templatesByActivity.reduce(
      (total, group) => total + group['_count']['_all'],
      0,
    );
    const activeTemplates =
      templatesByActivity.find((group) => group.isActive)?.['_count']['_all'] ??
      0;
    const pendingJobs =
      jobsByStatus.find((group) => group.status === 'QUEUED')?.['_count'][
        '_all'
      ] ?? 0;
    const failedJobs =
      jobsByStatus.find((group) => group.status === 'FAILED')?.['_count'][
        '_all'
      ] ?? 0;

    return {
      users,
      books,
      templates,
      activeTemplates,
      pendingJobs,
      failedJobs,
      completedBooks,
      failedBooks,
    };
  }
}
