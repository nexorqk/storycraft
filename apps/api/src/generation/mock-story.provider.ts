import { Injectable, Logger } from '@nestjs/common';

import type { StoryPageRequest, StoryPageResult, StoryProvider } from './types';

@Injectable()
export class MockStoryProvider implements StoryProvider {
  private readonly logger = new Logger(MockStoryProvider.name);

  async generatePage(request: StoryPageRequest): Promise<StoryPageResult> {
    this.logger.log(
      `[MOCK] Generating page ${request.pageNumber} for child "${request.childName}"`,
    );

    const text = this.generateMockText(request);
    const illustrationPrompt = this.generateMockIllustrationPrompt(request);

    return { text, illustrationPrompt };
  }

  private generateMockText(request: StoryPageRequest): string {
    const name = request.childName || 'Малыш';
    const pageText = request.pageTextPrompt;

    return `${name} ${this.getPageStory(pageText, request.pageNumber)}.`;
  }

  private getPageStory(prompt: string, pageNumber: number): string {
    const stories: Record<number, string> = {
      1: 'проснулся рано утром и выглянул в окно. Солнце светило ярко, и птицы пели свои песни.',
      2: 'решил отправиться на прогулку и заметил что-то интересное в кустах.',
      3: 'пошёл по тропинке через красивый лес, полный чудес.',
      4: 'встречает нового друга, который тоже хочет приключений.',
      5: 'вместе они придумывают план и готовятся к путешествию.',
      6: 'на пути возникает препятствие, но друзья не сдаются.',
      7: 'доброта и дружба помогают преодолеть все трудности.',
      8: 'возвращается домой счастливым, с новыми друзьями и воспоминаниями.',
      9: 'рассказывает всем о своём удивительном приключении.',
      10: 'засыпает с улыбкой, мечтая о новых приключениях.',
    };

    return (
      stories[pageNumber] ||
      `отправляется в увлекательное путешествие на странице ${pageNumber}.`
    );
  }

  private generateMockIllustrationPrompt(request: StoryPageRequest): string {
    return `Children's book illustration: ${request.childName} in a warm, friendly scene. ${request.templateIllustrationStylePrompt}. Page ${request.pageNumber}.`;
  }
}
