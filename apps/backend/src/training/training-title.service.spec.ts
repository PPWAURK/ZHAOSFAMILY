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
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      userTrainingTitle: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
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

  it('creates an admin-defined title', async () => {
    const { service, prismaService } = createService();

    prismaService.trainingTitle.findUnique.mockResolvedValue(null);
    prismaService.trainingTitle.create.mockResolvedValue({
      ...TITLE_ROW,
      code: 'TITLE_CUSTOM_SERVICE',
      nameZh: '服务之星',
      nameEn: 'Service Star',
      nameFr: 'Étoile service',
    });

    await expect(
      service.createTitle({
        code: ' TITLE_CUSTOM_SERVICE ',
        nameZh: ' 服务之星 ',
        nameEn: ' Service Star ',
        nameFr: ' Étoile service ',
        frameStyle: 'gold',
        unlockPositionCode: 'FOH',
        sortOrder: 10,
      }),
    ).resolves.toMatchObject({
      code: 'TITLE_CUSTOM_SERVICE',
      name: {
        zh: '服务之星',
        en: 'Service Star',
        fr: 'Étoile service',
      },
      earned: false,
      earnedAt: null,
    });
    expect(prismaService.trainingTitle.create).toHaveBeenCalledWith({
      data: {
        code: 'TITLE_CUSTOM_SERVICE',
        nameZh: '服务之星',
        nameEn: 'Service Star',
        nameFr: 'Étoile service',
        frameStyle: 'gold',
        unlockPositionCode: 'FOH',
        sortOrder: 10,
      },
    });
  });

  it('generates a title code when admins do not provide one', async () => {
    const { service, prismaService } = createService();

    prismaService.trainingTitle.findUnique.mockResolvedValue(null);
    prismaService.trainingTitle.create.mockResolvedValue({
      ...TITLE_ROW,
      code: 'TITLE_SERVICE_STAR',
      nameZh: '服务之星',
      nameEn: 'Service Star',
      nameFr: 'Étoile service',
    });

    await expect(
      service.createTitle({
        nameZh: '服务之星',
        nameEn: 'Service Star',
        nameFr: 'Étoile service',
        frameStyle: 'red',
        unlockPositionCode: 'ALL',
      }),
    ).resolves.toMatchObject({
      code: 'TITLE_SERVICE_STAR',
      earned: false,
    });
    expect(prismaService.trainingTitle.findUnique).toHaveBeenCalledWith({
      where: { code: 'TITLE_SERVICE_STAR' },
      select: { code: true },
    });
    expect(prismaService.trainingTitle.create).toHaveBeenCalledWith({
      data: {
        code: 'TITLE_SERVICE_STAR',
        nameZh: '服务之星',
        nameEn: 'Service Star',
        nameFr: 'Étoile service',
        frameStyle: 'red',
        unlockPositionCode: 'ALL',
        sortOrder: 0,
      },
    });
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

  it('equips an earned title for the current user', async () => {
    const { service, prismaService } = createService();
    const earnedAt = new Date('2026-07-07T10:00:00.000Z');

    prismaService.userTrainingTitle.findUnique.mockResolvedValue({
      titleCode: 'TITLE_FOH_CERTIFIED',
    });
    prismaService.user.update.mockResolvedValue({ id: 7 });
    prismaService.trainingTitle.findMany.mockResolvedValue([TITLE_ROW]);
    prismaService.userTrainingTitle.findMany.mockResolvedValue([
      { titleCode: 'TITLE_FOH_CERTIFIED', earnedAt },
    ]);
    prismaService.user.findUnique.mockResolvedValue({
      equippedTrainingTitleCode: 'TITLE_FOH_CERTIFIED',
    });

    await expect(
      service.equipTitleForUser(7, 'TITLE_FOH_CERTIFIED'),
    ).resolves.toMatchObject({
      equippedTitleCode: 'TITLE_FOH_CERTIFIED',
      equippedTitle: {
        code: 'TITLE_FOH_CERTIFIED',
        earned: true,
      },
    });
    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { equippedTrainingTitleCode: 'TITLE_FOH_CERTIFIED' },
      select: { id: true },
    });
  });

  it('revokes a title assignment from an existing user', async () => {
    const { service, prismaService } = createService();

    prismaService.trainingTitle.findUnique.mockResolvedValue({
      code: 'TITLE_FOH_CERTIFIED',
    });
    prismaService.user.findUnique.mockResolvedValue({ id: 7 });
    prismaService.userTrainingTitle.deleteMany.mockResolvedValue({ count: 1 });
    prismaService.user.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.revokeTitleFromUser(7, 'TITLE_FOH_CERTIFIED'),
    ).resolves.toEqual({ message: 'TRAINING_TITLE_REVOKED' });
    expect(prismaService.userTrainingTitle.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 7,
        titleCode: 'TITLE_FOH_CERTIFIED',
      },
    });
    expect(prismaService.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        equippedTrainingTitleCode: 'TITLE_FOH_CERTIFIED',
      },
      data: { equippedTrainingTitleCode: null },
    });
  });
});
