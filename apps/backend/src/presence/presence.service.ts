import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { AuthUser } from '../auth/auth.service';
import type { MobilePresenceSummary } from './presence.types';

const DEFAULT_HEARTBEAT_TTL_SECONDS = 90;
const PRESENCE_KEY_PREFIX = 'presence:mobile:user:';

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class PresenceService implements OnModuleDestroy {
  private redisClient?: Redis;
  private redisConnectionPromise?: Promise<Redis>;

  constructor(private readonly configService: ConfigService) {}

  async recordMobileHeartbeat(user: AuthUser): Promise<void> {
    const redis = await this.getRedisClient();

    try {
      await redis.set(
        `${PRESENCE_KEY_PREFIX}${user.id}`,
        '1',
        'EX',
        this.heartbeatTtlSeconds,
      );
    } catch {
      throw new ServiceUnavailableException('PRESENCE_UNAVAILABLE');
    }
  }

  async getMobilePresenceSummary(): Promise<MobilePresenceSummary> {
    const redis = await this.getRedisClient();

    try {
      const onlineMobileUsers = await this.countPresenceKeys(redis);

      return {
        onlineMobileUsers,
        refreshedAt: new Date().toISOString(),
        ttlSeconds: this.heartbeatTtlSeconds,
      };
    } catch {
      throw new ServiceUnavailableException('PRESENCE_UNAVAILABLE');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  private get heartbeatTtlSeconds(): number {
    return parsePositiveInteger(
      this.configService.get<string>('PRESENCE_TTL_SECONDS'),
      DEFAULT_HEARTBEAT_TTL_SECONDS,
    );
  }

  private getRedisClient(): Promise<Redis> {
    if (this.redisClient) {
      return this.redisConnectionPromise ?? Promise.resolve(this.redisClient);
    }

    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();

    if (!redisUrl) {
      throw new ServiceUnavailableException('PRESENCE_NOT_CONFIGURED');
    }

    this.redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });

    this.redisConnectionPromise = this.redisClient
      .connect()
      .then(() => this.redisClient!)
      .catch((error: unknown) => {
        this.redisClient?.disconnect();
        this.redisClient = undefined;
        this.redisConnectionPromise = undefined;
        throw error;
      });

    return this.redisConnectionPromise;
  }

  private async countPresenceKeys(redis: Redis): Promise<number> {
    let cursor = '0';
    let count = 0;

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        `${PRESENCE_KEY_PREFIX}*`,
        'COUNT',
        500,
      );
      cursor = nextCursor;
      count += keys.length;
    } while (cursor !== '0');

    return count;
  }
}
