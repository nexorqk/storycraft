import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { CloudflareAiProvider } from '../cloudflare.provider';
import {
  ContentPolicyError,
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderServerError,
  ProviderTimeoutError,
} from '../errors';

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, string> = {
      CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
      CLOUDFLARE_API_TOKEN: 'test-api-token',
    };
    if (values[key]) return values[key];
    throw new Error(`Missing config: ${key}`);
  }),
  get: jest.fn((key: string) => {
    const values: Record<string, string> = {
      CLOUDFLARE_MODEL: '@cf/meta/llama-3-8b-instruct',
      CLOUDFLARE_MAX_RETRIES: '2',
      CLOUDFLARE_TIMEOUT_MS: '5000',
    };
    return values[key] ?? undefined;
  }),
};

describe('CloudflareAiProvider', () => {
  let provider: CloudflareAiProvider;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();

    fetchSpy = jest.spyOn(global, 'fetch');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudflareAiProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<CloudflareAiProvider>(CloudflareAiProvider);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
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

  function mockFetchResponse(body: unknown, status = 200) {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    } as Response);
  }

  it('generates a page successfully', async () => {
    fetchSpy.mockReturnValue(
      mockFetchResponse({
        result: {
          response: 'TEXT: Привет, Маша!\nILLUSTRATION: A cute dinosaur',
        },
        success: true,
      }),
    );

    const result = await provider.generatePage(baseRequest);

    expect(result.text).toBe('Привет, Маша!');
    expect(result.illustrationPrompt).toBe('A cute dinosaur');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const callArgs = fetchSpy.mock.calls[0];
    expect(callArgs[0]).toContain(
      '/accounts/test-account-id/ai/run/@cf/meta/llama-3-8b-instruct',
    );
    expect(callArgs[1]).toMatchObject({
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-api-token',
        'Content-Type': 'application/json',
      },
    });
  });

  it('retries on rate limit error and succeeds', async () => {
    fetchSpy
      .mockRejectedValueOnce(new Error('429 Rate limit exceeded'))
      .mockReturnValue(
        mockFetchResponse({
          result: { response: 'TEXT: Hello\nILLUSTRATION: Forest' },
          success: true,
        }),
      );

    const result = await provider.generatePage(baseRequest);

    expect(result.text).toBe('Hello');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('retries on server error and succeeds', async () => {
    fetchSpy
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockReturnValue(
        mockFetchResponse({
          result: { response: 'TEXT: Hello\nILLUSTRATION: Forest' },
          success: true,
        }),
      );

    const result = await provider.generatePage(baseRequest);

    expect(result.text).toBe('Hello');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('throws ProviderRateLimitError after exhausting retries', async () => {
    fetchSpy.mockRejectedValue(new Error('429 Rate limit exceeded'));

    await expect(provider.generatePage(baseRequest)).rejects.toThrow(
      ProviderRateLimitError,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('throws ProviderServerError after exhausting retries', async () => {
    fetchSpy.mockRejectedValue(new Error('500 Internal Server Error'));

    await expect(provider.generatePage(baseRequest)).rejects.toThrow(
      ProviderServerError,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('throws ProviderAuthError without retry', async () => {
    fetchSpy.mockRejectedValue(new Error('401 Unauthorized: Invalid API key'));

    await expect(provider.generatePage(baseRequest)).rejects.toThrow(
      ProviderAuthError,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('throws ContentPolicyError without retry', async () => {
    fetchSpy.mockRejectedValue(
      new Error('400 Bad Request: content_policy_violation'),
    );

    await expect(provider.generatePage(baseRequest)).rejects.toThrow(
      ContentPolicyError,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('throws ProviderTimeoutError on timeout', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        CLOUDFLARE_MODEL: '@cf/meta/llama-3-8b-instruct',
        CLOUDFLARE_MAX_RETRIES: '0',
        CLOUDFLARE_TIMEOUT_MS: '50',
      };
      return values[key] ?? undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudflareAiProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    const fastProvider = module.get<CloudflareAiProvider>(CloudflareAiProvider);

    fetchSpy.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200)),
    );

    await expect(fastProvider.generatePage(baseRequest)).rejects.toThrow(
      ProviderTimeoutError,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  }, 10000);

  it('parses response without explicit markers', async () => {
    fetchSpy.mockReturnValue(
      mockFetchResponse({
        result: { response: 'Just some story text' },
        success: true,
      }),
    );

    const result = await provider.generatePage(baseRequest);

    expect(result.text).toBe('Just some story text');
    expect(result.illustrationPrompt).toContain('watercolor style');
  });

  it('throws when Cloudflare AI returns empty response', async () => {
    fetchSpy.mockReturnValue(
      mockFetchResponse({
        result: { response: '   ' },
        success: true,
      }),
    );

    await expect(provider.generatePage(baseRequest)).rejects.toThrow(
      'Cloudflare AI returned empty response',
    );
  });

  it('throws when Cloudflare AI returns unsuccessful response', async () => {
    fetchSpy.mockReturnValue(
      mockFetchResponse({
        success: false,
        errors: [{ code: 1001, message: 'Model not found' }],
      }),
    );

    await expect(provider.generatePage(baseRequest)).rejects.toThrow(
      'Cloudflare AI error: Model not found',
    );
  });

  it('throws when HTTP response is not ok', async () => {
    fetchSpy.mockReturnValue(
      mockFetchResponse({ message: 'Bad gateway' }, 502),
    );

    await expect(provider.generatePage(baseRequest)).rejects.toThrow(
      'Cloudflare AI HTTP 502',
    );
  });
});
