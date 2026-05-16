import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { DallEProvider } from '../dalle.provider';
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
      DALLE_MODEL: 'dall-e-3',
      DALLE_SIZE: '1024x1024',
      DALLE_QUALITY: 'standard',
      DALLE_MAX_RETRIES: '2',
      DALLE_TIMEOUT_MS: '5000',
    };
    return values[key] ?? undefined;
  }),
};

describe('DallEProvider', () => {
  let provider: DallEProvider;
  let mockGenerate: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mockGenerate = jest.fn();
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      images: {
        generate: mockGenerate,
      },
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DallEProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<DallEProvider>(DallEProvider);
  });

  const baseRequest = {
    prompt: 'A cute dinosaur in a forest',
    bookId: 'book-1',
    pageNumber: 1,
  };

  it('generates an illustration successfully', async () => {
    mockGenerate.mockResolvedValue({
      data: [{ b64_json: Buffer.from('fake-image-data').toString('base64') }],
    });

    const result = await provider.generate(baseRequest);

    expect(result.buffer.toString()).toBe('fake-image-data');
    expect(result.mimeType).toBe('image/png');
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it('retries on rate limit error and succeeds', async () => {
    mockGenerate
      .mockRejectedValueOnce(new Error('429 Rate limit exceeded'))
      .mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from('fake-image-data').toString('base64') }],
      });

    const result = await provider.generate(baseRequest);

    expect(result.buffer.toString()).toBe('fake-image-data');
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it('retries on server error and succeeds', async () => {
    mockGenerate
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce({
        data: [{ b64_json: Buffer.from('fake-image-data').toString('base64') }],
      });

    const result = await provider.generate(baseRequest);

    expect(result.buffer.toString()).toBe('fake-image-data');
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it('throws ProviderRateLimitError after exhausting retries', async () => {
    mockGenerate.mockRejectedValue(new Error('429 Rate limit exceeded'));

    await expect(provider.generate(baseRequest)).rejects.toThrow(
      ProviderRateLimitError,
    );
    expect(mockGenerate).toHaveBeenCalledTimes(3);
  }, 15000);

  it('throws ProviderServerError after exhausting retries', async () => {
    mockGenerate.mockRejectedValue(new Error('500 Internal Server Error'));

    await expect(provider.generate(baseRequest)).rejects.toThrow(
      ProviderServerError,
    );
    expect(mockGenerate).toHaveBeenCalledTimes(3);
  }, 15000);

  it('throws ProviderAuthError without retry', async () => {
    mockGenerate.mockRejectedValue(
      new Error('401 Unauthorized: Invalid API key'),
    );

    await expect(provider.generate(baseRequest)).rejects.toThrow(
      ProviderAuthError,
    );
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it('throws ContentPolicyError without retry', async () => {
    mockGenerate.mockRejectedValue(
      new Error('400 Bad Request: content_policy_violation'),
    );

    await expect(provider.generate(baseRequest)).rejects.toThrow(
      ContentPolicyError,
    );
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it('throws ProviderTimeoutError on timeout', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        DALLE_MODEL: 'dall-e-3',
        DALLE_SIZE: '1024x1024',
        DALLE_QUALITY: 'standard',
        DALLE_MAX_RETRIES: '0',
        DALLE_TIMEOUT_MS: '50',
      };
      return values[key] ?? undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DallEProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    const fastProvider = module.get<DallEProvider>(DallEProvider);

    mockGenerate.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200)),
    );

    await expect(fastProvider.generate(baseRequest)).rejects.toThrow(
      ProviderTimeoutError,
    );
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  }, 10000);

  it('throws when DALL-E returns empty response', async () => {
    mockGenerate.mockResolvedValue({
      data: [{}],
    });

    await expect(provider.generate(baseRequest)).rejects.toThrow(
      'DALL-E returned empty response',
    );
  });
});
