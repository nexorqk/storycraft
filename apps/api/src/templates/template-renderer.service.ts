import { Injectable } from '@nestjs/common';

type TemplateVariableValue = string | number | null | undefined;

const PLACEHOLDER_PATTERN = /\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}/g;

const DEFAULT_VARIABLES: Record<string, string> = {
  childName: 'герой',
  childAge: '',
  interests: 'приключения',
  mainInterest: 'приключения',
  favoriteToy: 'любимую игрушку',
  favoriteAnimal: 'маленького друга',
  heroName: 'герой',
  parentName: 'мама или папа',
  setting: 'волшебный лес',
};

@Injectable()
export class TemplateRendererService {
  renderText(
    baseText: string,
    variables: Record<string, TemplateVariableValue>,
  ): string {
    return baseText
      .replace(PLACEHOLDER_PATTERN, (_match, key: string) =>
        this.resolveValue(key, variables),
      )
      .replace(PLACEHOLDER_PATTERN, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private resolveValue(
    key: string,
    variables: Record<string, TemplateVariableValue>,
  ): string {
    const normalized = this.normalizeValue(variables[key]);

    if (normalized) {
      return normalized;
    }

    return DEFAULT_VARIABLES[key] ?? '';
  }

  private normalizeValue(value: TemplateVariableValue): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value)
      .replace(/[{}<>]/g, '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
}
