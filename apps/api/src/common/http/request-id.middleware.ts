import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

type RequestWithId = Request & {
  requestId?: string;
};

export function requestIdMiddleware(
  request: RequestWithId,
  response: Response,
  next: NextFunction,
) {
  const incomingRequestId = request.header('x-request-id');
  const requestId = incomingRequestId || randomUUID();

  request.requestId = requestId;
  response.setHeader('x-request-id', requestId);

  next();
}
