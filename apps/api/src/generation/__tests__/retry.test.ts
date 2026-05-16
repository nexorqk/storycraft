import {
  withRetry,
  withTimeout,
  isRetryableError,
  isContentPolicyError,
  calculateBackoffDelay,
  sleep,
} from '../../common/retry';

describe('retry utilities', () => {
  describe('isRetryableError', () => {
    it('returns true for rate limit errors', () => {
      expect(isRetryableError(new Error('429 Too Many Requests'))).toBe(true);
      expect(isRetryableError(new Error('rate limit exceeded'))).toBe(true);
    });

    it('returns true for timeout errors', () => {
      expect(isRetryableError(new Error('Request timeout'))).toBe(true);
      expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true);
      expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
    });

    it('returns true for server errors', () => {
      expect(isRetryableError(new Error('500 Internal Server Error'))).toBe(
        true,
      );
      expect(isRetryableError(new Error('502 Bad Gateway'))).toBe(true);
      expect(isRetryableError(new Error('503 Service Unavailable'))).toBe(true);
    });

    it('returns true for network errors', () => {
      expect(isRetryableError(new Error('Network error'))).toBe(true);
      expect(isRetryableError(new Error('Connection refused'))).toBe(true);
      expect(isRetryableError(new Error('Fetch failed'))).toBe(true);
    });

    it('returns false for unknown errors', () => {
      expect(isRetryableError(new Error('Something went wrong'))).toBe(false);
    });
  });

  describe('isContentPolicyError', () => {
    it('returns true for content policy violations', () => {
      expect(isContentPolicyError(new Error('content_policy_violation'))).toBe(
        true,
      );
      expect(isContentPolicyError(new Error('Content policy violation'))).toBe(
        true,
      );
      expect(isContentPolicyError(new Error('Blocked by safety system'))).toBe(
        true,
      );
    });

    it('returns false for other errors', () => {
      expect(isContentPolicyError(new Error('Rate limit'))).toBe(false);
    });
  });

  describe('calculateBackoffDelay', () => {
    it('increases delay exponentially', () => {
      const d0 = calculateBackoffDelay(0, 1000, 30000);
      const d1 = calculateBackoffDelay(1, 1000, 30000);
      const d2 = calculateBackoffDelay(2, 1000, 30000);

      expect(d0).toBeGreaterThanOrEqual(1000);
      expect(d1).toBeGreaterThanOrEqual(2000);
      expect(d2).toBeGreaterThanOrEqual(4000);
    });

    it('respects max delay', () => {
      const delay = calculateBackoffDelay(10, 1000, 5000);
      expect(delay).toBeLessThanOrEqual(5000);
    });

    it('adds jitter', () => {
      const delays = Array.from({ length: 20 }, () =>
        calculateBackoffDelay(0, 1000, 30000),
      );
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('withRetry', () => {
    it('returns result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable errors and succeeds', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('throws after exhausting retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('503'));

      await expect(
        withRetry(fn, {
          maxRetries: 2,
          baseDelayMs: 10,
          maxDelayMs: 100,
        }),
      ).rejects.toThrow('503');

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('does not retry non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Bad Request'));

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          baseDelayMs: 10,
          maxDelayMs: 100,
          shouldRetry: () => false,
        }),
      ).rejects.toThrow('Bad Request');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry callback', async () => {
      const onRetry = jest.fn();
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('503'))
        .mockResolvedValue('success');

      await withRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.objectContaining({ message: '503' }),
        1,
        expect.any(Number),
      );
    });
  });

  describe('withTimeout', () => {
    it('resolves when promise resolves before timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000, 'test');
      expect(result).toBe('success');
    });

    it('rejects when promise takes too long', async () => {
      const promise = sleep(100);

      await expect(withTimeout(promise, 10, 'slow operation')).rejects.toThrow(
        'slow operation timed out after 10ms',
      );
    });
  });

  describe('sleep', () => {
    it('resolves after specified ms', async () => {
      const start = Date.now();
      await sleep(50);
      expect(Date.now() - start).toBeGreaterThanOrEqual(45);
    });
  });
});
