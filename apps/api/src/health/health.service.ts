import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

type CheckStatus = 'ok' | 'error';

type HealthCheck = {
  status: CheckStatus;
  message?: string;
};

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getLiveness() {
    return {
      status: 'ok',
      service: 'storycraft-api',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const checks = {
      database: await this.checkDatabase(),
    };
    const status = Object.values(checks).every((check) => check.status === 'ok')
      ? 'ok'
      : 'error';

    return {
      status,
      service: 'storycraft-api',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
      };
    } catch (error) {
      return {
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Database check failed',
      };
    }
  }
}
