import { Controller, Get } from '@nestjs/common';
import { HealthService, type HealthStatus } from './health.service';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): Promise<HealthStatus> {
    return this.healthService.getHealthStatus();
  }
}
