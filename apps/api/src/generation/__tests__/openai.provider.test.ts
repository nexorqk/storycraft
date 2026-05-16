import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { OpenAiProvider } from '../openai.provider';
import {
  ContentPolicyError,
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderServerError,
  ProviderTimeoutError,
} from '../errors';

jest.mock('openai');

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    if (key === 'OPENAI_API_KEY') return 'test-api-key';
    throw new Error(`Missing config: ${key}`);
  }),
  get: jest.fn((key: string) => {
    const values: Record<string, string> = {
      OPENAI_MODEL: 'gpt-4o-mini',
      OPENAI_MAX_RETRIES: '2',
      OPENAI_TIMEOUT_MS: '5000',
    };
    return values[key] ?? undefined;
  }),
};

describe('OpenAiProvider', () => {
  let provider: OpenAiProvider;
  let mockCreate: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mockCreate = jest.fn();
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<OpenAiProvider>(OpenAiProvider);
  });

  const baseRequest = {
    childName: 'Masha',
    childAge: 5,
    childInterests: ['dinosaurs'],
    templateStoryPrompt: 'A magical adventure',
    templateIllustrationStylePrompt: 'watercolor style',
    coverStyle: 'default',
    pageNumber: 1,
    pageTextPrompt: 'Once upon a time',
    previousPages: [],
  };

  it('generates a page successfully', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'TEXT: Привет, Маша!\nILLUSTRATION: A cute dinosaur',
          },
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    });

    const result = await provider.generatePage(baseRequest);

    expect(result.text).toBe('Привет, Маша!');
    expect(result.illustrationPrompt).toBe('A cute dinosaur');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('retries on rate limit error and succeeds', async () => {
    mockCreate
      .mockRejectedValueOnce(new Error('429 Rate limit exceeded'))
      .mockResolvedValueOnce({
        choices: [
          { message: { content: 'TEXT: Hello\nILLUSTRATION: Forest' } },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 10 },
      });

    const result = await provider.generatePage(baseRequest);

    expect(result.text).toBe('Hello');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('retries on server error and succeeds', async () => {
    mockCreate
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce({
        choices: [
          { message: { content: 'TEXT: Hello\nILLUSTRATION: Forest' } },
        ],
        usage: null,
      });

    const result = await provider.generatePage(baseRequest);

    expect(result.text).toBe('Hello');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('throws ProviderRateLimitError after exhausting retries', async () => {
    mockCreate.mockRejectedValue(new Error('429 Rate limit exceeded'));

    await expect(provider.generatePage(baseRequest)).rejects.toThrow(
      ProviderRateLimitError,
    );
    expect(mockCreate).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('throws ProviderServerError after exhausting retries', async () => {
    mockCreate.mockRejectedValue(new Error('500 Internal Server Error'));

    await expect(provider.generatePage(baseRequest)).rejects.toThrow(
      ProviderServerError,
    );
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('throws ProviderAuthError without retry', async () => {
    mockCreate.mockRejectedValue(
      new Error('401 Unauthorized: Invalid API key'),
    );

    await expect(provider.generatePage(baseRequest)).rejects.toThrow(
      ProviderAuthError,
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('throws ContentPolicyError without retry', async () => {
    mockCreate.mockRejectedValue(
      new Error('400 Bad Request: content_policy_violation'),
    );

    await expect(provider.generatePage(baseRequest)).rejects.toThrow(
      ContentPolicyError,
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('throws ProviderTimeoutError on timeout', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        OPENAI_MODEL: 'gpt-4o-mini',
        OPENAI_MAX_RETRIES: '0',
        OPENAI_TIMEOUT_MS: '50',
      };
      return values[key] ?? undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    const fastProvider = module.get<OpenAiProvider>(OpenAiProvider);

    mockCreate.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200)),
    );

    await expect(fastProvider.generatePage(baseRequest)).rejects.toThrow(
      ProviderTimeoutError,
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  }, 10000);

  it('parses response without explicit markers', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Just some story text' } }],
      usage: null,
    });

    const result = await provider.generatePage(baseRequest);

    expect(result.text).toBe('Just some story text');
    expect(result.illustrationPrompt).toContain('watercolor style');
  });

  it('throws when OpenAI returns empty response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '   ' } }],
      usage: null,
    });

    await expect(provider.generatePage(baseRequest)).rejects.toThrow(
      'OpenAI returned empty response',
    );
  });
});
