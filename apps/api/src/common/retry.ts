import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
  shouldRetry?: (error: Error) => boolean;
}

export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Rate limits
  if (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests')
  ) {
    return true;
  }

  // Timeouts
  if (
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnreset') ||
    message.includes('econnrefused')
  ) {
    return true;
  }

  // Server errors
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('internal server error') ||
    message.includes('bad gateway') ||
    message.includes('service unavailable')
  ) {
    return true;
  }

  // Network / connection errors
  if (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('fetch failed') ||
    message.includes('socket hang up')
  ) {
    return true;
  }

  return false;
}

export function isContentPolicyError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('content_policy_violation') ||
    message.includes('content policy') ||
    message.includes('safety system') ||
    message.includes('blocked')
  );
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelayMs;
  return Math.min(exponential + jitter, maxDelayMs);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const {
    maxRetries,
    baseDelayMs,
    maxDelayMs,
    onRetry,
    shouldRetry = isRetryableError,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      if (!shouldRetry(lastError)) {
        throw lastError;
      }

      const delayMs = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs);

      if (onRetry) {
        onRetry(lastError, attempt + 1, delayMs);
      }

      await sleep(delayMs);
    }
  }

  throw lastError ?? new Error('Retry exhausted with no error');
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Clean up timeout if promise resolves first (best effort)
      promise.then(
        () => clearTimeout(timeoutId),
        () => clearTimeout(timeoutId),
      );
    }),
  ]);
}
