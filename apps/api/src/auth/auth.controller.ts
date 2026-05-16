import {
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';

type GoogleCallbackRequest = Request & {
  user?: {
    id: string;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  startGoogleAuth() {
    return undefined;
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async handleGoogleCallback(
    @Req() request: GoogleCallbackRequest,
    @Res() response: Response,
  ) {
    if (!request.user) {
      throw new UnauthorizedException('Google authentication failed');
    }

    const sessionToken = await this.authService.createSessionToken(
      request.user.id,
    );

    response.cookie(
      this.authService.getSessionCookieName(),
      sessionToken,
      this.authService.getSessionCookieOptions(),
    );

    return response.redirect(this.authService.getPostLoginRedirectUrl());
  }

  @Get('me')
  @SkipThrottle()
  async getCurrentUser(@Req() request: Request) {
    const user = await this.authService.getUserFromRequest(request);

    return {
      user,
    };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(
      this.authService.getSessionCookieName(),
      this.authService.getSessionCookieOptions(),
    );

    return {
      ok: true,
    };
  }
}
