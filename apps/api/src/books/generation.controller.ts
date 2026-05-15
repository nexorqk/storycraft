import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { PublicUser } from '../users/users.service';
import { BooksService } from './books.service';

@Controller('books')
@UseGuards(SessionAuthGuard)
export class GenerationController {
  constructor(private readonly books: BooksService) {}

  @Post(':bookId/generate')
  async triggerGeneration(
    @CurrentUser() user: PublicUser,
    @Param('bookId', new ParseUUIDPipe()) bookId: string,
  ) {
    return this.books.triggerGeneration(user.id, bookId);
  }

  @Get('jobs/:jobId')
  async getJob(
    @CurrentUser() user: PublicUser,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    return this.books.getGenerationJob(user.id, jobId);
  }
}
