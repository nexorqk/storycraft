import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import type {
  IllustrationRequest,
  IllustrationResult,
  IllustrationProvider,
} from './illustration-types';

@Injectable()
export class DallEProvider implements IllustrationProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly size: string;
  private readonly quality: string;
  private readonly logger = new Logger(DallEProvider.name);

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
    this.model = this.config.get('DALLE_MODEL') ?? 'dall-e-3';
    this.size = this.config.get('DALLE_SIZE') ?? '1024x1024';
    this.quality = this.config.get('DALLE_QUALITY') ?? 'standard';
  }

  async generate(request: IllustrationRequest): Promise<IllustrationResult> {
    this.logger.log(
      `Generating illustration for book ${request.bookId}, page ${request.pageNumber}`,
    );

    const response = await this.client.images.generate({
      model: this.model,
      prompt: request.prompt,
      size: this.size as '1024x1024' | '1024x1792' | '1792x1024',
      quality: this.quality as 'standard' | 'hd',
      response_format: 'b64_json',
    });

    const imageData = response.data?.[0]?.b64_json;

    if (!imageData) {
      throw new Error('DALL-E returned empty response');
    }

    const buffer = Buffer.from(imageData, 'base64');

    this.logger.log(
      `Illustration generated: ${buffer.length} bytes for book ${request.bookId}`,
    );

    return { buffer, mimeType: 'image/png' };
  }
}
