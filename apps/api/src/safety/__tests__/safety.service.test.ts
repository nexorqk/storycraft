import { BadRequestException } from '@nestjs/common';

import { ContentPolicyError } from '../../generation/errors';
import { SafetyService } from '../safety.service';

describe('SafetyService', () => {
  const service = new SafetyService();

  it('allows ordinary child profile inputs', () => {
    expect(() =>
      service.assertUserInputAllowed([
        { label: 'child name', value: 'Masha' },
        { label: 'interests', value: ['space', 'animals'] },
      ]),
    ).not.toThrow();
  });

  it('rejects unsafe user input', () => {
    expect(() =>
      service.assertUserInputAllowed([
        { label: 'interests', value: ['space', 'наркотики'] },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects unsafe generated content as a content policy error', () => {
    expect(() =>
      service.assertGeneratedContentAllowed(
        'A graphic violence scene',
        'Generated story page',
      ),
    ).toThrow(ContentPolicyError);
  });
});
