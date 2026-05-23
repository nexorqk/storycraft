import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

type ChildVariableSource = {
  name: string;
  birthDate: Date | null;
  interests: string[];
  readingLevel: string | null;
};

type BookVariableSource = {
  childNameInStory: string | null;
  personalization: Prisma.JsonValue | null;
  child: ChildVariableSource;
};

type TemplateVariables = Record<string, string | number | null | undefined>;

@Injectable()
export class TemplateVariablesService {
  buildVariables(book: BookVariableSource): TemplateVariables {
    const personalization = this.toRecord(book.personalization);
    const childName =
      book.childNameInStory?.trim() || book.child.name.trim() || 'герой';
    const interests = book.child.interests
      .map((value) => value.trim())
      .filter(Boolean);
    const mainInterest =
      this.scalar(personalization.mainInterest) ??
      interests[0] ??
      'приключения';

    return {
      childName,
      childAge: book.child.birthDate
        ? this.calculateAge(book.child.birthDate)
        : null,
      interests: interests.length > 0 ? interests.join(', ') : 'приключения',
      readingLevel: book.child.readingLevel ?? null,
      mainInterest,
      favoriteToy:
        this.scalar(personalization.favoriteToy) ?? 'любимую игрушку',
      favoriteAnimal:
        this.scalar(personalization.favoriteAnimal) ?? 'маленького друга',
      heroName: this.scalar(personalization.heroName) ?? childName,
      parentName: this.scalar(personalization.parentName) ?? 'мама или папа',
      setting: this.scalar(personalization.setting) ?? 'волшебный лес',
    };
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  private toRecord(value: Prisma.JsonValue | null): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private scalar(value: unknown): string | number | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || null;
    }

    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }
}
