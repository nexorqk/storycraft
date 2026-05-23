import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { withRetry, withTimeout, isContentPolicyError } from '../common/retry';
import {
  ContentPolicyError,
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderServerError,
  ProviderTimeoutError,
} from './errors';
import type { StoryPageRequest, StoryPageResult, StoryProvider } from './types';

type CloudflareAiResponse = {
  result?: {
    response?: string;
  };
  success?: boolean;
  errors?: Array<{ code: number; message: string }>;
};

@Injectable()
export class CloudflareAiProvider implements StoryProvider {
  private readonly accountId: string;
  private readonly apiToken: string;
  private readonly model: string;
  private readonly logger = new Logger(CloudflareAiProvider.name);
  private readonly maxRetries: number;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.accountId = this.config.getOrThrow<string>('CLOUDFLARE_ACCOUNT_ID');
    this.apiToken = this.config.getOrThrow<string>('CLOUDFLARE_API_TOKEN');
    this.model = this.config.get('CLOUDFLARE_MODEL') ?? '@cf/meta/llama-3-8b-instruct';
    this.maxRetries = this.config.get('CLOUDFLARE_MAX_RETRIES')
      ? parseInt(this.config.get('CLOUDFLARE_MAX_RETRIES')!, 10)
      : 3;
    this.timeoutMs = this.config.get('CLOUDFLARE_TIMEOUT_MS')
      ? parseInt(this.config.get('CLOUDFLARE_TIMEOUT_MS')!, 10)
      : 30000;
  }

  async generatePage(request: StoryPageRequest): Promise<StoryPageResult> {
    const systemPrompt = this.buildSystemPrompt(request);
    const userPrompt = this.buildUserPrompt(request);

    this.logger.log(
      `Generating page ${request.pageNumber} for child "${request.childName}" using ${this.model}`,
    );

    try {
      const response = await withRetry(
        () =>
          withTimeout(
            this.callCloudflareApi(systemPrompt, userPrompt),
            this.timeoutMs,
            `Cloudflare AI completion (page ${request.pageNumber})`,
          ),
        {
          maxRetries: this.maxRetries,
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          onRetry: (error, attempt, delayMs) => {
            this.logger.warn(
              `Cloudflare AI retry ${attempt}/${this.maxRetries} for page ${request.pageNumber} after ${delayMs}ms: ${error.message}`,
            );
          },
          shouldRetry: (error) => this.isRetryable(error),
        },
      );

      const content = response.trim();

      if (!content) {
        throw new Error('Cloudflare AI returned empty response');
      }

      return this.parseResponse(content, request);
    } catch (error) {
      throw this.transformError(error);
    }
  }

  private async callCloudflareApi(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new Error(`Cloudflare AI HTTP ${response.status}: ${text}`);
    }

    const data = (await response.json()) as CloudflareAiResponse;

    if (!data.success) {
      const errorMessages = data.errors?.map((e) => e.message).join(', ') ?? 'Unknown error';
      throw new Error(`Cloudflare AI error: ${errorMessages}`);
    }

    const content = data.result?.response;

    if (!content) {
      throw new Error('Cloudflare AI returned empty response body');
    }

    return content;
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
        `Cloudflare AI content policy violation: ${error.message}`,
      );
    }

    if (
      message.includes('401') ||
      message.includes('unauthorized') ||
      message.includes('invalid api key')
    ) {
      return new ProviderAuthError(
        `Cloudflare AI authentication failed: ${error.message}`,
      );
    }

    if (message.includes('429') || message.includes('rate limit')) {
      return new ProviderRateLimitError(`Cloudflare AI rate limit: ${error.message}`);
    }

    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('etimedout')
    ) {
      return new ProviderTimeoutError(`Cloudflare AI timeout: ${error.message}`);
    }

    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    ) {
      return new ProviderServerError(`Cloudflare AI server error: ${error.message}`);
    }

    return error;
  }

  private buildSystemPrompt(request: StoryPageRequest): string {
    const illustrationStyle =
      request.coverStyle === 'default'
        ? request.templateIllustrationStylePrompt
        : this.coverStyleLabel(request.coverStyle);

    return [
      "You are a children's book author writing in Russian.",
      '',
      `Write for a child aged ${request.childAge ?? 'unknown'}.`,
      `The child is interested in: ${request.childInterests.length > 0 ? request.childInterests.join(', ') : 'general topics'}.`,
      '',
      'Rules:',
      '- Write in simple, clear Russian suitable for children.',
      '- Keep each page to 3-5 short sentences.',
      "- Use the child's name naturally in the story.",
      '- Maintain continuity with previous pages.',
      '- Keep the tone warm and encouraging.',
      '- Do not include any meta-commentary or explanations.',
      '',
      `Illustration style: ${illustrationStyle}`,
    ].join('\n');
  }

  private coverStyleLabel(style: string): string {
    const labels: Record<string, string> = {
      watercolor:
        'Soft watercolor illustration style, gentle colors, hand-painted feel',
      cartoon: 'Bright cartoon illustration style, bold outlines, vivid colors',
      realistic: 'Realistic illustration style, detailed, natural lighting',
    };
    return labels[style] ?? style;
  }

  private buildUserPrompt(request: StoryPageRequest): string {
    const parts: string[] = [];

    parts.push(`Story template prompt: ${request.templateStoryPrompt}`);
    parts.push(`Page ${request.pageNumber} prompt: ${request.pageTextPrompt}`);
    parts.push(`The main character's name is: ${request.childName}`);

    if (request.previousPages.length > 0) {
      parts.push('');
      parts.push('Previous pages for context:');
      request.previousPages.forEach((text, i) => {
        parts.push(`Page ${i + 1}: ${text}`);
      });
    }

    parts.push('');
    parts.push('Respond in this exact format (do not include anything else):');
    parts.push('```');
    parts.push('TEXT: <the story text for this page in Russian>');
    parts.push('ILLUSTRATION: <a detailed illustration prompt in English>');
    parts.push('```');

    return parts.join('\n');
  }

  private parseResponse(
    content: string,
    request: StoryPageRequest,
  ): StoryPageResult {
    const textMatch = content.match(/TEXT:\s*([\s\S]*?)(?=ILLUSTRATION:|$)/i);
    const illustMatch = content.match(/ILLUSTRATION:\s*([\s\S]*)/i);

    const text = textMatch?.[1]
      ? textMatch[1]
          .trim()
          .replace(/^```|```$/g, '')
          .trim()
      : content;

    const illustrationPrompt = illustMatch?.[1]
      ? illustMatch[1]
          .trim()
          .replace(/^```|```$/g, '')
          .trim()
      : `${request.templateIllustrationStylePrompt}. Page ${request.pageNumber} of a children's book.`;

    return { text, illustrationPrompt };
  }
}
