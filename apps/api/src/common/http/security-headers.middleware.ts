import type { Request, Response } from 'express';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-xss-protection': '0',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'content-security-policy': CONTENT_SECURITY_POLICY,
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'cross-origin-embedder-policy': 'require-corp',
};

export function securityHeadersMiddleware(
  request: Request,
  response: Response,
  next: () => void,
) {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.setHeader(header, value);
  }

  response.removeHeader('x-powered-by');

  next();
}
