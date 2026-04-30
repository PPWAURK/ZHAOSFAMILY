import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type HealthStatus = {
  status: 'ok';
  database: 'up';
  timestamp: string;
};

@Injectable()
export class HealthService {
  constructor(private readonly prismaService: PrismaService) {}

  async getHealthStatus(): Promise<HealthStatus> {
    try {
      await this.prismaService.$queryRawUnsafe('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }

    return {
      status: 'ok',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
