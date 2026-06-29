import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns the health payload when the database ping succeeds', async () => {
    const prismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ value: 1 }]),
    };
    const healthService = new HealthService(prismaService as never);

    const result = await healthService.getHealthStatus();

    expect(prismaService.$queryRaw).toHaveBeenCalled();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it('throws a service unavailable exception when the database ping fails', async () => {
    const prismaService = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('offline')),
    };
    const healthService = new HealthService(prismaService as never);

    await expect(healthService.getHealthStatus()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
