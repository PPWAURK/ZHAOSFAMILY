import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExpoPushService } from './expo-push.service';
import type {
  NotificationItem,
  NotificationListResult,
  NotificationPayload,
  PushTokenPlatform,
} from './notifications.types';

type RegisterPushTokenInput = {
  token: string;
  platform: PushTokenPlatform;
  deviceName?: string;
};

type ListNotificationsInput = {
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const DEFAULT_NOTIFICATION_TYPE = 'generic';

type NotificationRow = {
  id: number;
  type: string;
  title: string;
  body: string;
  data: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
};

function toNotificationItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: (row.data as Record<string, unknown> | null) ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

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

  /**
   * Persists an in-app notification for each recipient and, best-effort, pushes
   * it to their active devices. Persistence is independent of push tokens so a
   * user with no device (or a revoked token) still sees it in the app.
   */
  async sendToUsers(
    userIds: number[],
    payload: NotificationPayload,
  ): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    await this.persistForUsers(userIds, payload);
    await this.pushToDevices(userIds, payload);
  }

  async listForUser(
    userId: number,
    input: ListNotificationsInput = {},
  ): Promise<NotificationListResult> {
    const page = Math.max(1, Math.trunc(input.page ?? 1));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.trunc(input.pageSize ?? DEFAULT_PAGE_SIZE)),
    );

    const [rows, total, unreadCount] = await Promise.all([
      this.prismaService.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prismaService.notification.count({ where: { userId } }),
      this.countUnread(userId),
    ]);

    return {
      items: rows.map(toNotificationItem),
      page,
      pageSize,
      total,
      unreadCount,
    };
  }

  countUnread(userId: number): Promise<number> {
    return this.prismaService.notification.count({
      where: { userId, readAt: null },
    });
  }

  /** Marks a single notification read. Idempotent and scoped to the owner. */
  async markRead(userId: number, id: number): Promise<{ unreadCount: number }> {
    await this.prismaService.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { unreadCount: await this.countUnread(userId) };
  }

  async markAllRead(userId: number): Promise<{ unreadCount: number }> {
    await this.prismaService.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { unreadCount: 0 };
  }

  private async persistForUsers(
    userIds: number[],
    payload: NotificationPayload,
  ): Promise<void> {
    const type =
      typeof payload.data?.type === 'string'
        ? payload.data.type
        : DEFAULT_NOTIFICATION_TYPE;

    await this.prismaService.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title: payload.title,
        body: payload.body,
        ...(payload.data
          ? { data: payload.data as Prisma.InputJsonValue }
          : {}),
      })),
    });
  }

  private async pushToDevices(
    userIds: number[],
    payload: NotificationPayload,
  ): Promise<void> {
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
