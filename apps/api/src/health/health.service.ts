import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { GENERATION_QUEUE } from '../queues/generation-queue.constants';
import { StorageService } from '../storage/storage.service';

type CheckStatus = 'ok' | 'error';

type HealthCheck = {
  status: CheckStatus;
  message?: string;
};

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(GENERATION_QUEUE)
    private readonly generationQueue: Queue,
  ) {}

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
      queue: await this.checkQueue(),
      storage: await this.checkStorage(),
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

  private async checkQueue(): Promise<HealthCheck> {
    try {
      await this.generationQueue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      );

      return {
        status: 'ok',
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Queue check failed',
      };
    }
  }

  private async checkStorage(): Promise<HealthCheck> {
    try {
      await this.storage.checkReadiness();

      return {
        status: 'ok',
      };
    } catch (error) {
      return {
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Storage check failed',
      };
    }
  }
}
