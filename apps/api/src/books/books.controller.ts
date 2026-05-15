import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { PublicUser } from '../users/users.service';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';

@Controller('books')
@UseGuards(SessionAuthGuard)
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  async listBooks(@CurrentUser() user: PublicUser) {
    return { books: await this.books.listBooks(user.id) };
  }

  @Get(':bookId')
  async getBook(
    @CurrentUser() user: PublicUser,
    @Param('bookId', new ParseUUIDPipe()) bookId: string,
  ) {
    return { book: await this.books.getBook(user.id, bookId) };
  }

  @Post()
  async createBook(
    @CurrentUser() user: PublicUser,
    @Body() dto: CreateBookDto,
  ) {
    return { book: await this.books.createBook(user.id, dto) };
  }

  @Delete(':bookId')
  @HttpCode(200)
  async deleteBook(
    @CurrentUser() user: PublicUser,
    @Param('bookId', new ParseUUIDPipe()) bookId: string,
  ) {
    await this.books.deleteBook(user.id, bookId);
    return { ok: true };
  }
}
