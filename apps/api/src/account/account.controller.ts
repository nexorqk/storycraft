import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { PublicUser } from '../users/users.service';
import { AccountService } from './account.service';

@Controller('account')
@UseGuards(SessionAuthGuard)
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly auth: AuthService,
  ) {}

  @Get('export')
  @Header(
    'Content-Disposition',
    'attachment; filename="storycraft-export.json"',
  )
  async exportAccount(@CurrentUser() user: PublicUser) {
    return this.account.exportAccountData(user.id);
  }

  @Delete()
  @HttpCode(200)
  async deleteAccount(
    @CurrentUser() user: PublicUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.account.deleteAccount(user.id);
    response.clearCookie(
      this.auth.getSessionCookieName(),
      this.auth.getSessionCookieOptions(),
    );

    return {
      ok: true,
    };
  }
}
