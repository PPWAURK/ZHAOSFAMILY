import { ForbiddenException } from '@nestjs/common';
import { DashboardNewsService } from './dashboard-news.service';
import type { DashboardNewsActor } from './dashboard-news.types';

describe('DashboardNewsService publish notifications', () => {
  function createService() {
    const prismaService = {
      dashboardPost: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
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
      select: { id: true, jobRole: true, preferredLanguage: true },
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

  it('uses a plain-text title in push notifications', async () => {
    const { service, prismaService, notificationsService } = createService();
    prismaService.dashboardPost.create.mockResolvedValue({
      ...createdPostRow(),
      title: '[[zhao-style:size=20;weight=700]]Promo[[/zhao-style]] update',
    });
    prismaService.user.findMany.mockResolvedValue([
      { id: 2, preferredLanguage: 'zh' },
    ]);

    await service.createPost(holdingActor, createDto);

    expect(notificationsService.sendToUsers).toHaveBeenCalledWith(
      [2],
      expect.objectContaining({ body: 'Promo update' }),
    );
  });

  it('saves management visibility and only notifies management roles', async () => {
    const { service, prismaService, notificationsService } = createService();
    prismaService.dashboardPost.create.mockResolvedValue({
      ...createdPostRow(),
      visibility: 'management',
    });
    prismaService.user.findMany.mockResolvedValue([
      { id: 2, jobRole: 'store-manager', preferredLanguage: 'zh' },
      { id: 3, jobRole: 'front-server', preferredLanguage: 'zh' },
      { id: 4, jobRole: 'front-assistant,front-host', preferredLanguage: 'en' },
    ]);

    await service.createPost(holdingActor, {
      ...createDto,
      visibility: 'management',
    });

    const [createCall] = prismaService.dashboardPost.create.mock.calls as [
      [{ data: { visibility: string } }],
    ];
    expect(createCall[0].data.visibility).toBe('management');
    expect(notificationsService.sendToUsers).toHaveBeenCalledTimes(2);
    expect(notificationsService.sendToUsers).toHaveBeenCalledWith(
      [2],
      expect.objectContaining({ title: '最新公告' }),
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

  it('does not include management visibility for line-staff readers', async () => {
    const { service, prismaService } = createService();

    await service.listPosts(
      {
        id: 8,
        jobRole: 'front-server',
        restaurantId: 2,
        userLevel: 0,
      },
      {},
    );

    expect(prismaService.dashboardPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [{ visibility: 'public' }, { visibility: 'team' }],
            },
            {},
          ],
        },
      }),
    );
  });

  it('includes management visibility for management readers', async () => {
    const { service, prismaService } = createService();

    await service.listPosts(
      {
        id: 9,
        jobRole: 'front-assistant,front-host',
        restaurantId: 2,
        userLevel: 0,
      },
      {},
    );

    expect(prismaService.dashboardPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { visibility: 'public' },
                { visibility: 'team' },
                { visibility: 'management' },
                { visibility: 'private' },
              ],
            },
            {},
          ],
        },
      }),
    );
  });
});
