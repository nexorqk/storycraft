import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

const CSRF_COOKIE_NAME = 'storycraft_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const CSRF_SKIP_PATHS = new Set(['/api/auth/logout']);

function generateToken(): string {
  return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
}

export function csrfMiddleware(
  request: Request,
  response: Response,
  next: () => void,
) {
  const existingToken = request.cookies?.[CSRF_COOKIE_NAME] as
    | string
    | undefined;

  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    if (existingToken) {
      response.locals.csrfToken = existingToken;
    } else {
      const newToken = generateToken();
      const cookieOptions: Record<string, unknown> = {
        path: '/api',
        sameSite: 'lax',
        httpOnly: false,
        secure: request.secure,
      };
      if (process.env.NODE_ENV !== 'production') {
        cookieOptions.domain = 'localhost';
      }
      response.cookie(CSRF_COOKIE_NAME, newToken, cookieOptions);
      response.locals.csrfToken = newToken;
    }

    next();
    return;
  }

  if (CSRF_SKIP_PATHS.has(request.path)) {
    next();
    return;
  }

  const cookieToken = request.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  const headerToken = request.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    if (process.env.NODE_ENV !== 'production') {
      next();
      return;
    }
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
