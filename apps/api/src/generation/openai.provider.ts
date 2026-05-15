import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import type { StoryPageRequest, StoryPageResult, StoryProvider } from './types';

@Injectable()
export class OpenAiProvider implements StoryProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly logger = new Logger(OpenAiProvider.name);

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
    this.model = this.config.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
  }

  async generatePage(request: StoryPageRequest): Promise<StoryPageResult> {
    const systemPrompt = this.buildSystemPrompt(request);
    const userPrompt = this.buildUserPrompt(request);

    this.logger.log(
      `Generating page ${request.pageNumber} for child "${request.childName}" using ${this.model}`,
    );

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    return this.parseResponse(content, request);
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
      watercolor: 'Soft watercolor illustration style, gentle colors, hand-painted feel',
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
