import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

const CSRF_COOKIE_NAME = 'storycraft_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function generateToken(): string {
  return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
}

export function csrfMiddleware(request: Request, response: Response, next: () => void) {
  const existingToken = request.cookies?.[CSRF_COOKIE_NAME] as string | undefined;

  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    if (existingToken) {
      response.locals.csrfToken = existingToken;
    } else {
      const newToken = generateToken();
      response.cookie(CSRF_COOKIE_NAME, newToken, {
        path: '/api',
        sameSite: 'lax',
        httpOnly: false,
        secure: request.secure,
      });
      response.locals.csrfToken = newToken;
    }

    next();
    return;
  }

  const cookieToken = request.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  const headerToken = request.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    response.status(403).json({
      statusCode: 403,
      error: 'Forbidden',
      message: 'CSRF token validation failed',
    });
    return;
  }

  response.locals.csrfToken = cookieToken;
  next();
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };