import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EXPO_PUSH_CHUNK_SIZE,
  EXPO_PUSH_ENDPOINT,
  type ExpoPushMessage,
  type ExpoPushSendResult,
} from './notifications.types';

type ExpoTicket = {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

/**
 * Thin client over the Expo Push API. Sends notification messages in chunks and
 * surfaces tokens Expo flags as `DeviceNotRegistered` so callers can disable them.
 */
@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(messages: ExpoPushMessage[]): Promise<ExpoPushSendResult> {
    const invalidTokens: string[] = [];

    for (let i = 0; i < messages.length; i += EXPO_PUSH_CHUNK_SIZE) {
      const chunk = messages.slice(i, i + EXPO_PUSH_CHUNK_SIZE);
      const tickets = await this.sendChunk(chunk);

      tickets.forEach((ticket, index) => {
        if (ticket?.status === 'error') {
          if (ticket.details?.error === 'DeviceNotRegistered') {
            invalidTokens.push(chunk[index].to);
          }
          this.logger.warn(
            `Expo push error for ${chunk[index].to}: ${ticket.message ?? 'unknown'}`,
          );
        }
      });
    }

    return { invalidTokens };
  }

  private async sendChunk(chunk: ExpoPushMessage[]): Promise<ExpoTicket[]> {
    const endpoint =
      this.configService.get<string>('EXPO_PUSH_URL') ?? EXPO_PUSH_ENDPOINT;
    const body = chunk.map((message) => ({ sound: 'default', ...message }));

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        this.logger.error(`Expo push request failed: HTTP ${response.status}`);
        return [];
      }

      const payload = (await response.json()) as { data?: ExpoTicket[] };
      return payload.data ?? [];
    } catch (error) {
      this.logger.error(
        `Expo push request threw: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }
}
