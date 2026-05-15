import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { PdfService } from './pdf.service';

@Module({
  imports: [PrismaModule, StorageModule],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
