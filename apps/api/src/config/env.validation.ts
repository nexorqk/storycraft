import { z } from 'zod';

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
  .refine(
    (data) => {
      if (data.USE_MOCK_AI) {
        return true;
      }
      return (
        data.OPENAI_API_KEY !== 'replace-me' && data.OPENAI_API_KEY.length > 0
      );
    },
    {
      message: 'OPENAI_API_KEY must be set when USE_MOCK_AI is false',
      path: ['OPENAI_API_KEY'],
    },
  );

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
