import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ExceptionResponse = {
  error?: unknown;
  message?: unknown;
};

type RequestWithId = Request & {
  requestId?: string;
};

function isExceptionResponse(value: unknown): value is ExceptionResponse {
  return typeof value === 'object' && value !== null;
}

function normalizeMessage(
  exception: unknown,
  response: unknown,
): string | string[] {
  if (isExceptionResponse(response)) {
    if (typeof response.message === 'string') {
      return response.message;
    }

    if (
      Array.isArray(response.message) &&
      response.message.every((item) => typeof item === 'string')
    ) {
      return response.message;
    }
  }

  if (exception instanceof Error && exception.message) {
    return exception.message;
  }

  return 'Unexpected server error';
}

function normalizeDetails(
  response: unknown,
): Record<string, unknown> | undefined {
  if (!isExceptionResponse(response)) {
    return undefined;
  }

  const details = Object.fromEntries(
    Object.entries(response).filter(
      ([key]) => !['error', 'message', 'statusCode'].includes(key),
    ),
  );

  return Object.keys(details).length > 0 ? details : undefined;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithId>();
    const response = ctx.getResponse<Response>();
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const reason =
      isExceptionResponse(exceptionResponse) &&
      typeof exceptionResponse.error === 'string'
        ? exceptionResponse.error
        : HttpStatus[status] || 'Error';
    const details = normalizeDetails(exceptionResponse);

    response.status(status).json({
      statusCode: status,
      error: reason,
      message: normalizeMessage(exception, exceptionResponse),
      ...(details ? { details } : {}),
      path: request.originalUrl || request.url,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
