import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminTemplatesController } from './templates/admin-templates.controller';
import { AdminTemplatesService } from './templates/admin-templates.service';
import { AdminTemplatePagesController } from './templates/pages/admin-template-pages.controller';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AdminTemplatesController, AdminTemplatePagesController],
  providers: [AdminTemplatesService],
})
export class AdminModule {}
