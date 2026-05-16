import { BadRequestException, Injectable } from '@nestjs/common';

import { ContentPolicyError } from '../generation/errors';

type TextField = {
  label: string;
  value: string | string[] | null | undefined;
};

const DISALLOWED_PATTERNS = [
  /\b(?:porn|porno|sex|sexual|erotic)\b/i,
  /\b(?:suicide|self-harm|kill\s+myself)\b/i,
  /\b(?:gore|graphic\s+violence)\b/i,
  /\b(?:cocaine|heroin|meth)\b/i,
  /порн|эротик|сексуальн/i,
  /самоуб|суицид|селфхарм/i,
  /наркот|кокаин|героин|метамфетамин/i,
  /расчлен|каннибал/i,
];

@Injectable()
export class SafetyService {
  assertUserInputAllowed(fields: TextField[]): void {
    const violation = this.findViolation(fields);

    if (violation) {
      throw new BadRequestException(
        `${violation.label} contains content that is not allowed for children's book generation.`,
      );
    }
  }

  assertGeneratedContentAllowed(
    value: string | null | undefined,
    label: string,
  ): void {
    const violation = this.findViolation([{ label, value }]);

    if (violation) {
      throw new ContentPolicyError(
        `${violation.label} contains content that is not allowed for children's book generation.`,
      );
    }
  }

  private findViolation(fields: TextField[]): TextField | null {
    for (const field of fields) {
      const normalized = this.normalizeValue(field.value);

      if (!normalized) {
        continue;
      }

      if (DISALLOWED_PATTERNS.some((pattern) => pattern.test(normalized))) {
        return field;
      }
    }

    return null;
  }

  private normalizeValue(value: TextField['value']): string {
    return Array.isArray(value) ? value.join(' ') : (value ?? '');
  }
}
