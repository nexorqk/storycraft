import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AdminTemplatesController } from './templates/admin-templates.controller';
import { AdminTemplatesService } from './templates/admin-templates.service';
import { AdminTemplatePagesController } from './templates/pages/admin-template-pages.controller';
import { AdminDashboardController } from './dashboard/admin-dashboard.controller';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminBooksController } from './books/admin-books.controller';

@Module({
  imports: [AuthModule, PrismaModule, StorageModule],
  controllers: [
    AdminTemplatesController,
    AdminTemplatePagesController,
    AdminDashboardController,
    AdminUsersController,
    AdminBooksController,
  ],
  providers: [AdminTemplatesService],
})
export class AdminModule {}
