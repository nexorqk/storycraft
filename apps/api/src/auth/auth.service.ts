import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions, Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

type SessionPayload = {
  sub: string;
  jti: string;
};

type RequestWithCookies = Request & {
  cookies?: Record<string, string | undefined>;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
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
    return `${this.config.getOrThrow<string>('WEB_ORIGIN')}/auth/callback`;
  }

  async createSessionToken(userId: string) {
    const tokenId = randomUUID();
    const ttlSeconds = this.config.getOrThrow<number>(
      'AUTH_SESSION_TTL_SECONDS',
    );
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.prisma.authSession.create({
      data: {
        userId,
        tokenId,
        expiresAt,
      },
    });

    return this.jwt.signAsync({
      sub: userId,
      jti: tokenId,
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

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        authSessions: {
          some: {
            tokenId: payload.jti,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return this.users.toPublicUser(user);
  }

  async revokeSessionFromRequest(request: RequestWithCookies) {
    const token = request.cookies?.[this.getSessionCookieName()];

    if (!token) {
      return;
    }

    const payload = await this.verifySessionToken(token);

    if (!payload) {
      return;
    }

    await this.prisma.authSession.updateMany({
      where: {
        tokenId: payload.jti,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
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
