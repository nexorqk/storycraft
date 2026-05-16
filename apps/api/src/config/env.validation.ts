import { z } from 'zod';

const PLACEHOLDER_VALUES = new Set(['', 'replace-me', 'changeme']);

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_VALUES.has(value.trim().toLowerCase());
}

function isLocalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  } catch {
    return false;
  }
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function addProductionIssue(
  ctx: z.RefinementCtx,
  path: string,
  message: string,
) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: [path],
    message,
  });
}

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    API_PORT: z.coerce.number().int().positive().default(3001),
    API_ORIGIN: z.string().url().default('http://localhost:3001'),
    WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
    DATABASE_URL: z
      .string()
      .default(
        'postgresql://storycraft:storycraft@localhost:5432/storycraft?schema=public',
      ),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    GOOGLE_CLIENT_ID: z.string().default('replace-me'),
    GOOGLE_CLIENT_SECRET: z.string().default('replace-me'),
    GOOGLE_CALLBACK_URL: z
      .string()
      .url()
      .default('http://localhost:3001/api/auth/google/callback'),
    SESSION_SECRET: z.string().default('replace-me'),
    AUTH_COOKIE_NAME: z.string().default('storycraft_session'),
    AUTH_SESSION_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60 * 24 * 30),
    S3_ENDPOINT: z.string().url().default('http://localhost:3900'),
    S3_REGION: z.string().default('garage'),
    S3_BUCKET: z.string().default('storycraft-local'),
    S3_ACCESS_KEY_ID: z.string().default('replace-me'),
    S3_SECRET_ACCESS_KEY: z.string().default('replace-me'),
    S3_FORCE_PATH_STYLE: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    USE_MOCK_AI: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    OPENAI_API_KEY: z.string().default('replace-me'),
    OPENAI_MODEL: z.string().default('gpt-4o-mini'),
    OPENAI_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
    OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    DALLE_MODEL: z.string().default('dall-e-3'),
    DALLE_SIZE: z
      .enum(['1024x1024', '1024x1792', '1792x1024'])
      .default('1024x1024'),
    DALLE_QUALITY: z.enum(['standard', 'hd']).default('standard'),
    DALLE_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
    DALLE_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
    GENERATION_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    GENERATION_MAX_ACTIVE_JOBS_PER_USER: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(1),
    GENERATION_DAILY_JOB_LIMIT_PER_USER: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(10),
    AI_ESTIMATED_TEXT_PAGE_COST_USD: z.coerce
      .number()
      .nonnegative()
      .default(0.002),
    AI_ESTIMATED_IMAGE_COST_USD: z.coerce.number().nonnegative().default(0.04),
    AI_MAX_ESTIMATED_BOOK_COST_USD: z.coerce.number().nonnegative().default(1),
    RATE_LIMIT_SHORT_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60),
    RATE_LIMIT_SHORT_LIMIT: z.coerce.number().int().positive().default(30),
    RATE_LIMIT_LONG_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(3600),
    RATE_LIMIT_LONG_LIMIT: z.coerce.number().int().positive().default(300),
  })
  .superRefine((data, ctx) => {
    if (!data.USE_MOCK_AI && isPlaceholder(data.OPENAI_API_KEY)) {
      addProductionIssue(
        ctx,
        'OPENAI_API_KEY',
        'OPENAI_API_KEY must be set when USE_MOCK_AI is false',
      );
    }

    if (data.NODE_ENV !== 'production') {
      return;
    }

    const requiredSecrets = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'SESSION_SECRET',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
      'OPENAI_API_KEY',
    ] as const;

    for (const key of requiredSecrets) {
      if (isPlaceholder(data[key])) {
        addProductionIssue(
          ctx,
          key,
          `${key} must be set to a non-placeholder value in production`,
        );
      }
    }

    if (data.SESSION_SECRET.length < 32) {
      addProductionIssue(
        ctx,
        'SESSION_SECRET',
        'SESSION_SECRET must be at least 32 characters in production',
      );
    }

    if (data.USE_MOCK_AI) {
      addProductionIssue(
        ctx,
        'USE_MOCK_AI',
        'USE_MOCK_AI must be false in production',
      );
    }

    if (!isHttpsUrl(data.API_ORIGIN)) {
      addProductionIssue(
        ctx,
        'API_ORIGIN',
        'API_ORIGIN must be an https URL in production',
      );
    }

    if (!isHttpsUrl(data.WEB_ORIGIN)) {
      addProductionIssue(
        ctx,
        'WEB_ORIGIN',
        'WEB_ORIGIN must be an https URL in production',
      );
    }

    if (!isHttpsUrl(data.GOOGLE_CALLBACK_URL)) {
      addProductionIssue(
        ctx,
        'GOOGLE_CALLBACK_URL',
        'GOOGLE_CALLBACK_URL must be an https URL in production',
      );
    }

    if (
      data.DATABASE_URL ===
      'postgresql://storycraft:storycraft@localhost:5432/storycraft?schema=public'
    ) {
      addProductionIssue(
        ctx,
        'DATABASE_URL',
        'DATABASE_URL must not use the local default database in production',
      );
    }

    if (data.REDIS_URL === 'redis://localhost:6379') {
      addProductionIssue(
        ctx,
        'REDIS_URL',
        'REDIS_URL must not use the local default Redis URL in production',
      );
    }

    if (isLocalUrl(data.S3_ENDPOINT)) {
      addProductionIssue(
        ctx,
        'S3_ENDPOINT',
        'S3_ENDPOINT must not be localhost in production',
      );
    }

    if (data.S3_BUCKET === 'storycraft-local') {
      addProductionIssue(
        ctx,
        'S3_BUCKET',
        'S3_BUCKET must not use the local bucket name in production',
      );
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
