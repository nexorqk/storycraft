import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { withRetry, withTimeout, isContentPolicyError } from '../common/retry';
import {
  ContentPolicyError,
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderServerError,
  ProviderTimeoutError,
} from './errors';
import type {
  IllustrationRequest,
  IllustrationResult,
  IllustrationProvider,
} from './illustration-types';

// Approximate costs per image (USD) — update as pricing changes
const DALLE_3_COSTS: Record<string, Record<string, number>> = {
  '1024x1024': { standard: 0.04, hd: 0.08 },
  '1024x1792': { standard: 0.08, hd: 0.12 },
  '1792x1024': { standard: 0.08, hd: 0.12 },
};

@Injectable()
export class DallEProvider implements IllustrationProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly size: string;
  private readonly quality: string;
  private readonly logger = new Logger(DallEProvider.name);
  private readonly maxRetries: number;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
    this.model = this.config.get('DALLE_MODEL') ?? 'dall-e-3';
    this.size = this.config.get('DALLE_SIZE') ?? '1024x1024';
    this.quality = this.config.get('DALLE_QUALITY') ?? 'standard';
    this.maxRetries = this.config.get('DALLE_MAX_RETRIES')
      ? parseInt(this.config.get('DALLE_MAX_RETRIES')!, 10)
      : 3;
    this.timeoutMs = this.config.get('DALLE_TIMEOUT_MS')
      ? parseInt(this.config.get('DALLE_TIMEOUT_MS')!, 10)
      : 60000;
  }

  async generate(request: IllustrationRequest): Promise<IllustrationResult> {
    this.logger.log(
      `Generating illustration for book ${request.bookId}, page ${request.pageNumber}`,
    );

    try {
      const response = await withRetry(
        () =>
          withTimeout(
            this.client.images.generate({
              model: this.model,
              prompt: request.prompt,
              size: this.size as '1024x1024' | '1024x1792' | '1792x1024',
              quality: this.quality as 'standard' | 'hd',
              response_format: 'b64_json',
            }),
            this.timeoutMs,
            `DALL-E image generation (book ${request.bookId}, page ${request.pageNumber})`,
          ),
        {
          maxRetries: this.maxRetries,
          baseDelayMs: 2000,
          maxDelayMs: 60000,
          onRetry: (error, attempt, delayMs) => {
            this.logger.warn(
              `DALL-E retry ${attempt}/${this.maxRetries} for book ${request.bookId} page ${request.pageNumber} after ${delayMs}ms: ${error.message}`,
            );
          },
          shouldRetry: (error) => this.isRetryable(error),
        },
      );

      const imageData = response.data?.[0]?.b64_json;

      if (!imageData) {
        throw new Error('DALL-E returned empty response');
      }

      const buffer = Buffer.from(imageData, 'base64');
      const cost = this.calculateCost();

      this.logger.log(
        `Illustration generated: ${buffer.length} bytes for book ${request.bookId} (cost: $${cost.toFixed(4)})`,
      );

      return { buffer, mimeType: 'image/png' };
    } catch (error) {
      throw this.transformError(error);
    }
  }

  private calculateCost(): number {
    const sizeCosts = DALLE_3_COSTS[this.size];
    if (!sizeCosts) {
      return 0;
    }
    return sizeCosts[this.quality] ?? 0;
  }

  private isRetryable(error: Error): boolean {
    const message = error.message.toLowerCase();

    if (isContentPolicyError(error)) {
      return false;
    }

    if (
      message.includes('401') ||
      message.includes('unauthorized') ||
      message.includes('invalid api key')
    ) {
      return false;
    }

    return true;
  }

  private transformError(error: unknown): Error {
    if (!(error instanceof Error)) {
      return new Error(String(error));
    }

    const message = error.message.toLowerCase();

    if (isContentPolicyError(error)) {
      return new ContentPolicyError(
        `DALL-E content policy violation: ${error.message}`,
      );
    }

    if (
      message.includes('401') ||
      message.includes('unauthorized') ||
      message.includes('invalid api key')
    ) {
      return new ProviderAuthError(
        `DALL-E authentication failed: ${error.message}`,
      );
    }

    if (message.includes('429') || message.includes('rate limit')) {
      return new ProviderRateLimitError(`DALL-E rate limit: ${error.message}`);
    }

    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('etimedout')
    ) {
      return new ProviderTimeoutError(`DALL-E timeout: ${error.message}`);
    }

    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    ) {
      return new ProviderServerError(`DALL-E server error: ${error.message}`);
    }

    return error;
  }
}
