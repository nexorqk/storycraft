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
import { StorageService } from '../storage/storage.service';
import type { PublicUser } from '../users/users.service';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';

@Controller('books')
@UseGuards(SessionAuthGuard)
export class BooksController {
  constructor(
    private readonly books: BooksService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async listBooks(@CurrentUser() user: PublicUser) {
    return { books: await this.books.listBooks(user.id) };
  }

  @Get('usage')
  async getUsage(@CurrentUser() user: PublicUser) {
    return { usage: await this.books.getUsage(user.id) };
  }

  @Get(':bookId')
  async getBook(
    @CurrentUser() user: PublicUser,
    @Param('bookId', new ParseUUIDPipe()) bookId: string,
  ) {
    return { book: await this.books.getBook(user.id, bookId) };
  }

  @Get(':bookId/progress')
  async getBookProgress(
    @CurrentUser() user: PublicUser,
    @Param('bookId', new ParseUUIDPipe()) bookId: string,
  ) {
    return { progress: await this.books.getBookProgress(user.id, bookId) };
  }

  @Get(':bookId/illustration-urls')
  async getIllustrationUrls(
    @CurrentUser() user: PublicUser,
    @Param('bookId', new ParseUUIDPipe()) bookId: string,
  ) {
    const book = await this.books.getBook(user.id, bookId);

    const urls: Record<string, string> = {};

    for (const ill of book.illustrations) {
      if (ill.objectKey) {
        urls[ill.id] = await this.storage.getSignedDownloadUrl(ill.objectKey, 86400);
      }
    }

    return { urls };
  }

  @Get(':bookId/pdf-url')
  async getPdfUrl(
    @CurrentUser() user: PublicUser,
    @Param('bookId', new ParseUUIDPipe()) bookId: string,
  ) {
    const book = await this.books.getBook(user.id, bookId);

    if (!book.pdfObjectKey) {
      return { url: null };
    }

    const url = await this.storage.getSignedDownloadUrl(book.pdfObjectKey);
    return { url };
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
