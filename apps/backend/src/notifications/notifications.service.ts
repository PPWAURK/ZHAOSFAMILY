import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpoPushService } from './expo-push.service';
import type {
  NotificationPayload,
  PushTokenPlatform,
} from './notifications.types';

type RegisterPushTokenInput = {
  token: string;
  platform: PushTokenPlatform;
  deviceName?: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly expoPushService: ExpoPushService,
  ) {}

  async registerToken(
    userId: number,
    input: RegisterPushTokenInput,
  ): Promise<void> {
    const data = {
      platform: input.platform,
      deviceName: input.deviceName ?? null,
      disabledAt: null,
      lastSeenAt: new Date(),
    };

    await this.prismaService.pushToken.upsert({
      where: { token: input.token },
      create: { userId, token: input.token, ...data },
      update: { userId, ...data },
    });
  }

  async unregisterToken(userId: number, token: string): Promise<void> {
    await this.prismaService.pushToken.deleteMany({
      where: { token, userId },
    });
  }

  /** Sends a notification to every active device of the given users. */
  async sendToUsers(
    userIds: number[],
    payload: NotificationPayload,
  ): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    const tokens = await this.prismaService.pushToken.findMany({
      where: { userId: { in: userIds }, disabledAt: null },
      select: { token: true },
    });

    if (tokens.length === 0) {
      return;
    }

    const messages = tokens.map((row) => ({ to: row.token, ...payload }));
    const { invalidTokens } = await this.expoPushService.send(messages);

    if (invalidTokens.length > 0) {
      await this.prismaService.pushToken.updateMany({
        where: { token: { in: invalidTokens } },
        data: { disabledAt: new Date() },
      });
    }
  }
}
