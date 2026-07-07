import { TrainingTitleService } from './training-title.service';

const TITLE_ROW = {
  code: 'TITLE_FOH_CERTIFIED',
  nameZh: '前厅认证',
  nameEn: 'Front Certified',
  nameFr: 'Salle Certifié',
  frameStyle: 'gold',
  unlockPositionCode: 'FOH',
  sortOrder: 2,
};

describe('TrainingTitleService', () => {
  function createService() {
    const prismaService = {
      trainingTitle: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      userTrainingTitle: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    return {
      prismaService,
      service: new TrainingTitleService(prismaService as never),
    };
  }

  it('assigns a title to an existing user', async () => {
    const { service, prismaService } = createService();
    const earnedAt = new Date('2026-07-07T10:00:00.000Z');

    prismaService.trainingTitle.findUnique.mockResolvedValue(TITLE_ROW);
    prismaService.user.findUnique.mockResolvedValue({ id: 7 });
    prismaService.userTrainingTitle.upsert.mockResolvedValue({ earnedAt });

    await expect(
      service.assignTitleToUser(7, 'TITLE_FOH_CERTIFIED'),
    ).resolves.toMatchObject({
      code: 'TITLE_FOH_CERTIFIED',
      earned: true,
      earnedAt: earnedAt.toISOString(),
    });
    expect(prismaService.userTrainingTitle.upsert).toHaveBeenCalledWith({
      where: {
        userId_titleCode: {
          userId: 7,
          titleCode: 'TITLE_FOH_CERTIFIED',
        },
      },
      create: {
        userId: 7,
        titleCode: 'TITLE_FOH_CERTIFIED',
      },
      update: {},
      select: { earnedAt: true },
    });
  });

  it('lists distributable titles without user assignment state', async () => {
    const { service, prismaService } = createService();

    prismaService.trainingTitle.findMany.mockResolvedValue([TITLE_ROW]);

    await expect(service.listTitles()).resolves.toEqual([
      expect.objectContaining({
        code: 'TITLE_FOH_CERTIFIED',
        earned: false,
        earnedAt: null,
      }),
    ]);
  });

  it('lists active recipients with their assigned titles', async () => {
    const { service, prismaService } = createService();
    const earnedAt = new Date('2026-07-07T10:00:00.000Z');

    prismaService.user.findMany.mockResolvedValue([
      {
        id: 7,
        name: 'Mei Zhao',
        email: 'mei@example.com',
        accountStatus: 'approved',
        jobRole: 'front-server',
        restaurant: { id: 2, name: 'ZHAO Test' },
        trainingTitles: [{ earnedAt, title: TITLE_ROW }],
      },
    ]);

    await expect(service.listRecipients()).resolves.toEqual([
      {
        userId: 7,
        name: 'Mei Zhao',
        email: 'mei@example.com',
        accountStatus: 'approved',
        jobRole: 'front-server',
        restaurant: { id: 2, name: 'ZHAO Test' },
        titles: [
          expect.objectContaining({
            code: 'TITLE_FOH_CERTIFIED',
            earned: true,
            earnedAt: earnedAt.toISOString(),
          }),
        ],
      },
    ]);
  });

  it('revokes a title assignment from an existing user', async () => {
    const { service, prismaService } = createService();

    prismaService.trainingTitle.findUnique.mockResolvedValue({
      code: 'TITLE_FOH_CERTIFIED',
    });
    prismaService.user.findUnique.mockResolvedValue({ id: 7 });
    prismaService.userTrainingTitle.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      service.revokeTitleFromUser(7, 'TITLE_FOH_CERTIFIED'),
    ).resolves.toEqual({ message: 'TRAINING_TITLE_REVOKED' });
    expect(prismaService.userTrainingTitle.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 7,
        titleCode: 'TITLE_FOH_CERTIFIED',
      },
    });
  });
});
