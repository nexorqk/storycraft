import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions, Request } from 'express';

import { UsersService } from '../users/users.service';

type SessionPayload = {
  sub: string;
};

type RequestWithCookies = Request & {
  cookies?: Record<string, string | undefined>;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  getSessionCookieName() {
    return this.config.getOrThrow<string>('AUTH_COOKIE_NAME');
  }

  getSessionCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      maxAge: this.config.getOrThrow<number>('AUTH_SESSION_TTL_SECONDS') * 1000,
      path: '/',
      sameSite: 'lax',
      secure: this.config.getOrThrow<string>('NODE_ENV') === 'production',
    };
  }

  getPostLoginRedirectUrl() {
    return this.config.getOrThrow<string>('WEB_ORIGIN');
  }

  async createSessionToken(userId: string) {
    return this.jwt.signAsync({
      sub: userId,
    } satisfies SessionPayload);
  }

  async getUserFromRequest(request: RequestWithCookies) {
    const token = request.cookies?.[this.getSessionCookieName()];

    if (!token) {
      return null;
    }

    const payload = await this.verifySessionToken(token);

    if (!payload) {
      return null;
    }

    const user = await this.users.findById(payload.sub);

    return user ? this.users.toPublicUser(user) : null;
  }

  private async verifySessionToken(
    token: string,
  ): Promise<SessionPayload | null> {
    try {
      return await this.jwt.verifyAsync<SessionPayload>(token);
    } catch {
      return null;
    }
  }
}
