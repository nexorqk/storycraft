import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { HealthService } from './health.service';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  async getReadiness() {
    const readiness = await this.healthService.getReadiness();

    if (readiness.status !== 'ok') {
      throw new ServiceUnavailableException(readiness);
    }

    return readiness;
  }
}
