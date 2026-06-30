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
    const [users, books, templates, activeTemplates, pendingJobs, failedJobs, completedBooks, failedBooks] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.book.count(),
        this.prisma.template.count(),
        this.prisma.template.count({ where: { isActive: true } }),
        this.prisma.job.count({ where: { status: 'QUEUED' } }),
        this.prisma.job.count({ where: { status: 'FAILED' } }),
        this.prisma.book.count({ where: { status: 'COMPLETED' } }),
        this.prisma.book.count({ where: { status: 'FAILED' } }),
      ]);

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
