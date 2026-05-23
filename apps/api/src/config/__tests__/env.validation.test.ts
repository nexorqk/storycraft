import { validateEnv } from '../env.validation';

describe('validateEnv', () => {
  it('accepts local development defaults', () => {
    expect(() => validateEnv({})).not.toThrow();
  });

  it('rejects production placeholders and local endpoints', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
      }),
    ).toThrow(/SESSION_SECRET|GOOGLE_CLIENT_ID|S3_ENDPOINT/);
  });

  it('accepts a production no-AI configuration without AI provider secrets', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        API_ORIGIN: 'https://api.storycraft.example',
        WEB_ORIGIN: 'https://storycraft.example',
        DATABASE_URL:
          'postgresql://storycraft:strong-password@postgres.internal:5432/storycraft?schema=public',
        REDIS_URL: 'redis://redis.internal:6379',
        GOOGLE_CLIENT_ID: 'google-client-id',
        GOOGLE_CLIENT_SECRET: 'google-client-secret',
        GOOGLE_CALLBACK_URL:
          'https://api.storycraft.example/api/auth/google/callback',
        SESSION_SECRET: 'a-production-session-secret-with-32-chars',
        S3_ENDPOINT: 'https://s3.storycraft.example',
        S3_REGION: 'eu-central-1',
        S3_BUCKET: 'storycraft-prod',
        S3_ACCESS_KEY_ID: 's3-access-key',
        S3_SECRET_ACCESS_KEY: 's3-secret-key',
        S3_FORCE_PATH_STYLE: 'false',
      }),
    ).not.toThrow();
  });

  it('does not require AI secrets when USE_MOCK_AI is false', () => {
    expect(() =>
      validateEnv({
        USE_MOCK_AI: 'false',
      }),
    ).not.toThrow();
  });
});
