import { Provider } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const throttlerModule = ThrottlerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    throttlers: [
      {
        name: 'short',
        ttl: config.getOrThrow<number>('RATE_LIMIT_SHORT_TTL_SECONDS') * 1000,
        limit: config.getOrThrow<number>('RATE_LIMIT_SHORT_LIMIT'),
      },
      {
        name: 'long',
        ttl: config.getOrThrow<number>('RATE_LIMIT_LONG_TTL_SECONDS') * 1000,
        limit: config.getOrThrow<number>('RATE_LIMIT_LONG_LIMIT'),
      },
    ],
  }),
});

export const throttlerGuardProvider: Provider = {
  provide: 'APP_GUARD',
  useClass: ThrottlerGuard,
};