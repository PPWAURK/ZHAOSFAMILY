import { ForbiddenException } from '@nestjs/common';
import { DashboardNewsService } from './dashboard-news.service';
import type { DashboardNewsActor } from './dashboard-news.types';

describe('DashboardNewsService publish notifications', () => {
  function createService() {
    const prismaService = {
      dashboardPost: {
        create: jest.fn(),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const mediaService = { deleteFile: jest.fn() };
    const notificationsService = {
      sendToUsers: jest.fn().mockResolvedValue(undefined),
      registerToken: jest.fn(),
      unregisterToken: jest.fn(),
    };

    return {
      prismaService,
      notificationsService,
      service: new DashboardNewsService(
        mediaService as never,
        prismaService as never,
        notificationsService as never,
      ),
    };
  }

  const holdingActor: DashboardNewsActor = {
    id: 1,
    jobRole: 'holding',
    restaurantId: 99,
    userLevel: 3,
  };

  const createDto = {
    title: 'Promo de printemps',
    summary: 'Summary',
    body: 'Body',
    category: 'operations',
    visibility: 'public',
  };

  function createdPostRow() {
    return {
      id: 7,
      title: 'Promo de printemps',
      summary: 'Summary',
      body: 'Body',
      category: 'operations',
      visibility: 'public',
      tagsJson: '[]',
      attachmentName: null,
      attachmentMimeType: null,
      attachmentSizeBytes: null,
      attachmentBucket: null,
      attachmentObjectKey: null,
      restaurantId: 99,
      restaurant: { id: 99, name: 'ZHAO Holding' },
      author: { id: 1, name: 'Admin', email: 'admin@zhao.test' },
      createdAt: new Date('2026-06-18T08:00:00.000Z'),
      updatedAt: new Date('2026-06-18T08:00:00.000Z'),
    };
  }

  it('broadcasts a published post to approved users grouped by language', async () => {
    const { service, prismaService, notificationsService } = createService();
    prismaService.dashboardPost.create.mockResolvedValue(createdPostRow());
    prismaService.user.findMany.mockResolvedValue([
      { id: 2, preferredLanguage: 'zh' },
      { id: 3, preferredLanguage: 'zh' },
      { id: 4, preferredLanguage: 'en' },
    ]);

    await service.createPost(holdingActor, createDto);

    // Excludes the author and only targets approved users.
    expect(prismaService.user.findMany).toHaveBeenCalledWith({
      where: {
        accountStatus: 'approved',
        id: { not: 1 },
      },
      select: { id: true, preferredLanguage: true },
    });
    expect(notificationsService.sendToUsers).toHaveBeenCalledTimes(2);
    expect(notificationsService.sendToUsers).toHaveBeenCalledWith(
      [2, 3],
      expect.objectContaining({
        title: '最新公告',
        data: { type: 'dashboard-news', postId: '7' },
      }),
    );
    expect(notificationsService.sendToUsers).toHaveBeenCalledWith(
      [4],
      expect.objectContaining({ title: 'New announcement' }),
    );
  });

  it('does not notify when there is no audience', async () => {
    const { service, prismaService, notificationsService } = createService();
    prismaService.dashboardPost.create.mockResolvedValue(createdPostRow());
    prismaService.user.findMany.mockResolvedValue([]);

    await service.createPost(holdingActor, createDto);

    expect(notificationsService.sendToUsers).not.toHaveBeenCalled();
  });

  it('rejects publishing by a non-holding actor before any push', async () => {
    const { service, prismaService, notificationsService } = createService();

    await expect(
      service.createPost(
        { ...holdingActor, jobRole: 'front-of-house' },
        createDto,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaService.dashboardPost.create).not.toHaveBeenCalled();
    expect(notificationsService.sendToUsers).not.toHaveBeenCalled();
  });
});
