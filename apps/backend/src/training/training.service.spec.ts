import { NotFoundException } from '@nestjs/common';
import {
  resolveTrainingPositionCodes,
  type TrainingJobRolePositionRow,
  type TrainingPositionResolverPositionRow,
} from './training-position-resolver';
import { TrainingService } from './training.service';

describe('TrainingService', () => {
  function createService() {
    const userRole = {
      create: jest.fn(),
      deleteMany: jest.fn(),
    };
    const prismaService = {
      trainingMaterial: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      trainingMaterialProgress: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      trainingPosition: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      trainingJobRolePosition: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      trainingQuiz: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      role: {
        findMany: jest.fn(),
      },
      userRole,
      $transaction: jest.fn(),
    };
    prismaService.$transaction.mockImplementation(
      (
        callback: (tx: {
          userRole: typeof userRole;
          trainingMaterialProgress: typeof prismaService.trainingMaterialProgress;
        }) => unknown,
      ) =>
        Promise.resolve(
          callback({
            userRole,
            trainingMaterialProgress: prismaService.trainingMaterialProgress,
          }),
        ),
    );
    prismaService.trainingJobRolePosition.findMany.mockResolvedValue(
      TRAINING_JOB_ROLE_POSITIONS,
    );
    prismaService.trainingJobRolePosition.count.mockResolvedValue(0);
    // No quiz gating by default — quiz-specific behavior is covered in
    // training-quiz.service.spec.ts; these plan/progress tests predate quizzes.
    prismaService.trainingQuiz.findUnique.mockResolvedValue(null);
    prismaService.trainingQuiz.findMany.mockResolvedValue([]);
    const mediaService = {
      deleteFile: jest.fn(),
    };
    const titleService = {
      evaluateForPosition: jest.fn().mockResolvedValue(undefined),
    };

    return {
      prismaService,
      mediaService,
      titleService,
      service: new TrainingService(
        prismaService as never,
        mediaService as never,
        titleService as never,
      ),
    };
  }

  const TRAINING_JOB_ROLE_POSITIONS: TrainingJobRolePositionRow[] = [
    {
      jobRole: 'holding',
      positionCode: 'HOLDING',
      includeDescendants: false,
      grantsAllPositions: true,
    },
    {
      jobRole: 'regional-manager',
      positionCode: 'RM',
      includeDescendants: false,
      grantsAllPositions: true,
    },
    {
      jobRole: 'store-manager',
      positionCode: 'SM',
      includeDescendants: false,
      grantsAllPositions: true,
    },
    {
      jobRole: 'front-manager',
      positionCode: 'FOH',
      includeDescendants: true,
      grantsAllPositions: false,
    },
    {
      jobRole: 'back-manager',
      positionCode: 'BOH',
      includeDescendants: true,
      grantsAllPositions: false,
    },
    {
      jobRole: 'front-assistant',
      positionCode: 'FOH',
      includeDescendants: true,
      grantsAllPositions: false,
    },
    {
      jobRole: 'back-assistant',
      positionCode: 'BOH',
      includeDescendants: true,
      grantsAllPositions: false,
    },
    {
      jobRole: 'front-of-house',
      positionCode: 'FOH',
      includeDescendants: true,
      grantsAllPositions: false,
    },
    {
      jobRole: 'back-of-house',
      positionCode: 'BOH',
      includeDescendants: true,
      grantsAllPositions: false,
    },
    {
      jobRole: 'front-host',
      positionCode: 'FRONT_HOST',
      includeDescendants: false,
      grantsAllPositions: false,
    },
    {
      jobRole: 'back-rice',
      positionCode: 'BACK_RICE',
      includeDescendants: false,
      grantsAllPositions: false,
    },
  ];

  const service = createService().service;

  describe('training position resolver', () => {
    const positions: TrainingPositionResolverPositionRow[] = [
      { code: 'ALL', parentCode: null },
      { code: 'FOH', parentCode: null },
      { code: 'FRONT_HOST', parentCode: 'FOH' },
      { code: 'FRONT_CASHIER', parentCode: 'FOH' },
      { code: 'BOH', parentCode: null },
      { code: 'BACK_RICE', parentCode: 'BOH' },
      { code: 'SM', parentCode: null },
    ];

    it('includes the leaf position, ancestors, and all-position code', () => {
      const result = resolveTrainingPositionCodes(
        'front-host',
        positions,
        TRAINING_JOB_ROLE_POSITIONS,
      );

      expect(result).toEqual({
        positionCodes: ['FRONT_HOST', 'FOH', 'ALL'],
        warnings: [],
      });
    });

    it('includes descendants for branch roles', () => {
      const result = resolveTrainingPositionCodes(
        'front-manager',
        positions,
        TRAINING_JOB_ROLE_POSITIONS,
      );

      expect(result.positionCodes).toEqual([
        'FOH',
        'FRONT_HOST',
        'FRONT_CASHIER',
        'ALL',
      ]);
    });

    it('includes every active position for all-position roles', () => {
      const result = resolveTrainingPositionCodes(
        'store-manager',
        positions,
        TRAINING_JOB_ROLE_POSITIONS,
      );

      expect(result.positionCodes).toEqual([
        'ALL',
        'FOH',
        'FRONT_HOST',
        'FRONT_CASHIER',
        'BOH',
        'BACK_RICE',
        'SM',
      ]);
    });

    it('deduplicates multiple roles while preserving role order', () => {
      const result = resolveTrainingPositionCodes(
        'front-host,back-rice',
        positions,
        TRAINING_JOB_ROLE_POSITIONS,
      );

      expect(result.positionCodes).toEqual([
        'FRONT_HOST',
        'FOH',
        'BACK_RICE',
        'BOH',
        'ALL',
      ]);
    });

    it('falls back to all-position only when a role is unmapped', () => {
      const result = resolveTrainingPositionCodes(
        'unknown-role',
        positions,
        TRAINING_JOB_ROLE_POSITIONS,
      );

      expect(result).toEqual({
        positionCodes: ['ALL'],
        warnings: [
          {
            jobRole: 'unknown-role',
            reason: 'JOB_ROLE_MAPPING_NOT_FOUND',
          },
        ],
      });
    });
  });

  it('returns all training courses ordered by catalog priority', () => {
    const result = service.listCourses({});

    expect(result).toHaveLength(9);
    expect(result[0]).toMatchObject({
      id: 'm-safety-1',
      section: 'required',
      status: 'in_progress',
    });
  });

  it('filters training courses by section and status', () => {
    const result = service.listCourses({
      section: 'required',
      status: 'not_started',
    });

    expect(result.map((course) => course.id)).toEqual([
      'm-pos-1',
      'm-quiz-1',
      'm-fire-1',
    ]);
  });

  it('returns one training course by id', () => {
    const result = service.getCourse('m-greet-sop');

    expect(result).toMatchObject({
      id: 'm-greet-sop',
      titleCn: '客人迎接 SOP',
      progressPercent: 100,
    });
  });

  it('throws when the training course does not exist', () => {
    expect(() => service.getCourse('missing-course')).toThrow(
      NotFoundException,
    );
  });

  it('lists only active training positions as a tree', async () => {
    const { service, prismaService } = createService();
    prismaService.trainingPosition.findMany.mockResolvedValue([
      {
        code: 'FOH',
        nameZh: '前厅',
        nameEn: 'Front of House',
        nameFr: 'Salle',
        parentCode: null,
        isActive: true,
        sortOrder: 10,
      },
      {
        code: 'FOH_WAITER',
        nameZh: '服务员',
        nameEn: 'Waiter',
        nameFr: 'Serveur',
        parentCode: 'FOH',
        isActive: true,
        sortOrder: 11,
      },
    ]);

    await expect(service.listPositions()).resolves.toEqual([
      {
        code: 'FOH',
        name: { zh: '前厅', en: 'Front of House', fr: 'Salle' },
        parentCode: null,
        isActive: true,
        sortOrder: 10,
        children: [
          {
            code: 'FOH_WAITER',
            name: { zh: '服务员', en: 'Waiter', fr: 'Serveur' },
            parentCode: 'FOH',
            isActive: true,
            sortOrder: 11,
            children: [],
          },
        ],
      },
    ]);
    expect(prismaService.trainingPosition.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  });

  it('rejects duplicate training position codes', async () => {
    const { service, prismaService } = createService();
    prismaService.trainingPosition.findUnique.mockResolvedValue({
      code: 'FOH_WAITER',
    });

    await expect(
      service.createPosition({
        code: 'FOH_WAITER',
        nameZh: '服务员',
        nameEn: 'Waiter',
        nameFr: 'Serveur',
        parentCode: 'FOH',
        sortOrder: 11,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rejects materials assigned to inactive positions', async () => {
    const { service, prismaService } = createService();
    prismaService.trainingPosition.findUnique.mockResolvedValue({
      isActive: false,
    });

    await expect(
      service.createMaterial({
        positionId: 'FOH_WAITER',
        type: 'VIDEO',
        isRequired: true,
        title: 'Greeting',
        description: '',
        originalName: 'greeting.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 120,
        bucket: 'company-private-files',
        objectKey: 'training/FOH/VIDEO/greeting.mp4',
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(prismaService.trainingMaterial.create).not.toHaveBeenCalled();
  });

  it('deletes the training material object and database row', async () => {
    const { service, prismaService, mediaService } = createService();
    const row = {
      id: 12,
      positionId: 'FOH',
      type: 'VIDEO',
      isRequired: true,
      title: 'Greeting SOP',
      description: null,
      originalName: 'greeting.mp4',
      mimeType: 'video/mp4',
      sizeBytes: BigInt(120),
      bucket: 'company-private-files',
      objectKey: 'training/FOH/VIDEO/greeting.mp4',
      createdAt: new Date('2026-04-27T08:00:00.000Z'),
      updatedAt: new Date('2026-04-27T08:00:00.000Z'),
    };

    prismaService.trainingMaterial.findUnique.mockResolvedValue(row);
    prismaService.trainingMaterial.delete.mockResolvedValue(row);
    mediaService.deleteFile.mockResolvedValue(undefined);

    await expect(service.deleteMaterial(12)).resolves.toEqual({
      message: 'TRAINING_MATERIAL_DELETED',
    });
    expect(mediaService.deleteFile).toHaveBeenCalledWith(row.objectKey);
    expect(prismaService.trainingMaterial.delete).toHaveBeenCalledWith({
      where: { id: 12 },
    });
  });

  it('throws when deleting a missing training material', async () => {
    const { service, prismaService, mediaService } = createService();
    prismaService.trainingMaterial.findUnique.mockResolvedValue(null);

    await expect(service.deleteMaterial(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mediaService.deleteFile).not.toHaveBeenCalled();
  });

  it('deletes an unused custom training position', async () => {
    const { service, prismaService } = createService();
    const row = {
      code: 'CUSTOM_BARISTA',
      nameZh: '咖啡师',
      nameEn: 'Barista',
      nameFr: 'Barista',
      parentCode: 'FOH',
      isActive: true,
      sortOrder: 90,
    };

    prismaService.trainingPosition.findUnique.mockResolvedValue(row);
    prismaService.trainingPosition.count.mockResolvedValue(0);
    prismaService.trainingMaterial.count.mockResolvedValue(0);
    prismaService.trainingPosition.delete.mockResolvedValue(row);

    await expect(service.deletePosition('CUSTOM_BARISTA')).resolves.toEqual({
      message: 'TRAINING_POSITION_DELETED',
    });
    expect(prismaService.trainingPosition.delete).toHaveBeenCalledWith({
      where: { code: 'CUSTOM_BARISTA' },
    });
  });

  it('rejects deleting a training position with materials', async () => {
    const { service, prismaService } = createService();
    prismaService.trainingPosition.findUnique.mockResolvedValue({
      code: 'CUSTOM_BARISTA',
      nameZh: '咖啡师',
      nameEn: 'Barista',
      nameFr: 'Barista',
      parentCode: 'FOH',
      isActive: true,
      sortOrder: 90,
    });
    prismaService.trainingPosition.count.mockResolvedValue(0);
    prismaService.trainingMaterial.count.mockResolvedValue(1);

    await expect(
      service.deletePosition('CUSTOM_BARISTA'),
    ).rejects.toMatchObject({
      status: 400,
    });
    expect(prismaService.trainingPosition.delete).not.toHaveBeenCalled();
  });

  it('rejects deleting a training position used by job role mappings', async () => {
    const { service, prismaService } = createService();
    prismaService.trainingPosition.findUnique.mockResolvedValue({
      code: 'CUSTOM_BARISTA',
      nameZh: '咖啡师',
      nameEn: 'Barista',
      nameFr: 'Barista',
      parentCode: 'FOH',
      isActive: true,
      sortOrder: 90,
    });
    prismaService.trainingPosition.count.mockResolvedValue(0);
    prismaService.trainingMaterial.count.mockResolvedValue(0);
    prismaService.trainingJobRolePosition.count.mockResolvedValue(1);

    await expect(
      service.deletePosition('CUSTOM_BARISTA'),
    ).rejects.toMatchObject({
      status: 400,
    });
    expect(prismaService.trainingPosition.delete).not.toHaveBeenCalled();
  });

  it('marks a training material as completed for a user', async () => {
    const { service, prismaService } = createService();
    const materialRow = {
      id: 12,
      positionId: 'FOH',
      type: 'VIDEO',
      isRequired: true,
      title: 'Greeting SOP',
      description: null,
      originalName: 'greeting.mp4',
      mimeType: 'video/mp4',
      sizeBytes: BigInt(120),
      bucket: 'company-private-files',
      objectKey: 'training/FOH/VIDEO/greeting.mp4',
      createdAt: new Date('2026-04-27T08:00:00.000Z'),
      updatedAt: new Date('2026-04-27T08:00:00.000Z'),
    };
    const progressRow = {
      materialId: 12,
      status: 'completed',
      progressPct: 100,
      lastOpenedAt: new Date('2026-05-05T08:00:00.000Z'),
      completedAt: new Date('2026-05-05T08:00:00.000Z'),
    };

    prismaService.trainingMaterial.findUnique.mockResolvedValue(materialRow);
    prismaService.trainingMaterialProgress.upsert.mockResolvedValue(
      progressRow,
    );

    await expect(
      service.updateProgress(7, 12, {
        status: 'completed',
        progressPct: 100,
      }),
    ).resolves.toEqual({
      materialId: 12,
      status: 'completed',
      progressPct: 100,
      lastOpenedAt: '2026-05-05T08:00:00.000Z',
      completedAt: '2026-05-05T08:00:00.000Z',
    });
    expect(prismaService.trainingMaterialProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_materialId: {
            userId: 7,
            materialId: 12,
          },
        },
      }),
    );
  });

  it('does not regress completed progress when the material is opened again', async () => {
    const { service, prismaService } = createService();
    const completedAt = new Date('2026-05-05T08:00:00.000Z');
    const materialRow = {
      id: 12,
      positionId: 'FOH',
      type: 'VIDEO',
      isRequired: true,
      title: 'Greeting SOP',
      description: null,
      originalName: 'greeting.mp4',
      mimeType: 'video/mp4',
      sizeBytes: BigInt(120),
      bucket: 'company-private-files',
      objectKey: 'training/FOH/VIDEO/greeting.mp4',
      createdAt: new Date('2026-04-27T08:00:00.000Z'),
      updatedAt: new Date('2026-04-27T08:00:00.000Z'),
    };
    const progressRow = {
      materialId: 12,
      status: 'completed',
      progressPct: 100,
      lastOpenedAt: new Date('2026-05-05T09:00:00.000Z'),
      completedAt,
    };

    prismaService.trainingMaterial.findUnique.mockResolvedValue(materialRow);
    prismaService.trainingMaterialProgress.findUnique.mockResolvedValue({
      status: 'completed',
      completedAt,
    });
    prismaService.trainingMaterialProgress.upsert.mockResolvedValue(
      progressRow,
    );

    await expect(
      service.updateProgress(7, 12, {
        status: 'in_progress',
        progressPct: 10,
      }),
    ).resolves.toMatchObject({
      materialId: 12,
      status: 'completed',
      progressPct: 100,
      completedAt: '2026-05-05T08:00:00.000Z',
    });
    expect(
      prismaService.trainingMaterialProgress.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        userId_materialId: {
          userId: 7,
          materialId: 12,
        },
      },
      select: {
        status: true,
        completedAt: true,
      },
    });
    expect(prismaService.trainingMaterialProgress.upsert).toHaveBeenCalled();
  });

  it('builds a personal training plan from the user position and all-position materials', async () => {
    const { service, prismaService } = createService();

    prismaService.trainingPosition.findMany.mockResolvedValue([
      {
        code: 'ALL',
        nameZh: '全岗通用',
        nameEn: 'All',
        nameFr: 'Tous',
        parentCode: null,
        isActive: true,
        sortOrder: 0,
      },
      {
        code: 'FOH',
        nameZh: '前厅',
        nameEn: 'Front of House',
        nameFr: 'Salle',
        parentCode: null,
        isActive: true,
        sortOrder: 10,
      },
      {
        code: 'FRONT_HOST',
        nameZh: '迎宾',
        nameEn: 'Host',
        nameFr: 'Accueil',
        parentCode: 'FOH',
        isActive: true,
        sortOrder: 11,
      },
      {
        code: 'BOH',
        nameZh: '后厨',
        nameEn: 'Back of House',
        nameFr: 'Cuisine',
        parentCode: null,
        isActive: true,
        sortOrder: 20,
      },
    ]);
    prismaService.trainingMaterial.findMany.mockResolvedValue([
      buildMaterialRow({ id: 1, positionId: 'FOH', isRequired: true }),
      buildMaterialRow({ id: 2, positionId: 'ALL', isRequired: true }),
      buildMaterialRow({ id: 3, positionId: 'FRONT_HOST', isRequired: false }),
    ]);
    prismaService.trainingMaterialProgress.findMany.mockResolvedValue([
      {
        materialId: 1,
        status: 'completed',
        progressPct: 100,
        lastOpenedAt: new Date('2026-05-05T08:00:00.000Z'),
        completedAt: new Date('2026-05-05T08:00:00.000Z'),
      },
    ]);

    await expect(
      service.getMyPlan({ id: 7, jobRole: 'front-host' }),
    ).resolves.toMatchObject({
      positionCodes: ['FRONT_HOST', 'FOH', 'ALL'],
      summary: {
        requiredTotal: 2,
        requiredCompleted: 1,
        completionPercent: 50,
      },
      required: [
        { id: 1, progress: { status: 'completed', progressPct: 100 } },
        { id: 2, progress: { status: 'not_started', progressPct: 0 } },
      ],
      optional: [{ id: 3 }],
    });
    expect(prismaService.trainingMaterial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          positionId: {
            in: ['FRONT_HOST', 'FOH', 'ALL'],
          },
        },
      }),
    );
  });

  it('builds holding training plans without falling back to a store position', async () => {
    const { service, prismaService } = createService();

    prismaService.trainingPosition.findMany.mockResolvedValue([
      {
        code: 'ALL',
        nameZh: '全岗通用',
        nameEn: 'All',
        nameFr: 'Tous',
        parentCode: null,
        isActive: true,
        sortOrder: 0,
      },
      {
        code: 'HOLDING',
        nameZh: '总部',
        nameEn: 'Holding',
        nameFr: 'Holding',
        parentCode: null,
        isActive: true,
        sortOrder: 60,
      },
    ]);
    prismaService.trainingMaterial.findMany.mockResolvedValue([
      buildMaterialRow({ id: 8, positionId: 'HOLDING', isRequired: true }),
      buildMaterialRow({ id: 9, positionId: 'ALL', isRequired: true }),
    ]);
    prismaService.trainingMaterialProgress.findMany.mockResolvedValue([]);

    await expect(
      service.getMyPlan({ id: 7, jobRole: 'holding' }),
    ).resolves.toMatchObject({
      positionCodes: ['ALL', 'HOLDING'],
      summary: {
        requiredTotal: 2,
        requiredCompleted: 0,
        completionPercent: 0,
      },
    });
    expect(prismaService.trainingMaterial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          positionId: {
            in: ['ALL', 'HOLDING'],
          },
        },
      }),
    );
  });

  it('combines multiple employee positions in the personal training plan', async () => {
    const { service, prismaService } = createService();

    prismaService.trainingPosition.findMany.mockResolvedValue([
      {
        code: 'ALL',
        nameZh: '全岗通用',
        nameEn: 'All',
        nameFr: 'Tous',
        parentCode: null,
        isActive: true,
        sortOrder: 0,
      },
      {
        code: 'FOH',
        nameZh: '前厅',
        nameEn: 'Front of House',
        nameFr: 'Salle',
        parentCode: null,
        isActive: true,
        sortOrder: 10,
      },
      {
        code: 'BOH',
        nameZh: '后厨',
        nameEn: 'Back of House',
        nameFr: 'Cuisine',
        parentCode: null,
        isActive: true,
        sortOrder: 20,
      },
    ]);
    prismaService.trainingMaterial.findMany.mockResolvedValue([
      buildMaterialRow({ id: 1, positionId: 'FOH', isRequired: true }),
      buildMaterialRow({ id: 2, positionId: 'BOH', isRequired: true }),
      buildMaterialRow({ id: 3, positionId: 'ALL', isRequired: true }),
    ]);
    prismaService.trainingMaterialProgress.findMany.mockResolvedValue([]);

    await expect(
      service.getMyPlan({
        id: 7,
        jobRole: 'front-of-house,back-of-house',
      }),
    ).resolves.toMatchObject({
      positionCodes: ['FOH', 'BOH', 'ALL'],
      summary: {
        requiredTotal: 3,
        requiredCompleted: 0,
        completionPercent: 0,
      },
    });
  });

  it('requires store managers to learn every store position', async () => {
    const { service, prismaService } = createService();

    prismaService.trainingPosition.findMany.mockResolvedValue([
      {
        code: 'ALL',
        nameZh: '全岗通用',
        nameEn: 'All',
        nameFr: 'Tous',
        parentCode: null,
        isActive: true,
        sortOrder: 0,
      },
      {
        code: 'FOH',
        nameZh: '前厅',
        nameEn: 'Front of House',
        nameFr: 'Salle',
        parentCode: null,
        isActive: true,
        sortOrder: 10,
      },
      {
        code: 'BOH',
        nameZh: '后厨',
        nameEn: 'Back of House',
        nameFr: 'Cuisine',
        parentCode: null,
        isActive: true,
        sortOrder: 20,
      },
      {
        code: 'CASH',
        nameZh: '收银',
        nameEn: 'Cashier',
        nameFr: 'Caisse',
        parentCode: null,
        isActive: true,
        sortOrder: 30,
      },
      {
        code: 'SM',
        nameZh: '店长',
        nameEn: 'Store Manager',
        nameFr: 'Responsable boutique',
        parentCode: null,
        isActive: true,
        sortOrder: 40,
      },
      {
        code: 'RM',
        nameZh: '区域经理',
        nameEn: 'Regional Manager',
        nameFr: 'Responsable régional',
        parentCode: null,
        isActive: true,
        sortOrder: 50,
      },
      {
        code: 'HOLDING',
        nameZh: '总部',
        nameEn: 'Holding',
        nameFr: 'Holding',
        parentCode: null,
        isActive: true,
        sortOrder: 60,
      },
    ]);
    prismaService.trainingMaterial.findMany.mockResolvedValue([
      buildMaterialRow({ id: 1, positionId: 'FOH', isRequired: true }),
      buildMaterialRow({ id: 2, positionId: 'BOH', isRequired: true }),
      buildMaterialRow({ id: 3, positionId: 'CASH', isRequired: true }),
      buildMaterialRow({ id: 4, positionId: 'SM', isRequired: true }),
      buildMaterialRow({ id: 5, positionId: 'RM', isRequired: true }),
      buildMaterialRow({ id: 6, positionId: 'HOLDING', isRequired: true }),
      buildMaterialRow({ id: 7, positionId: 'ALL', isRequired: true }),
    ]);
    prismaService.trainingMaterialProgress.findMany.mockResolvedValue([]);

    await expect(
      service.getMyPlan({ id: 7, jobRole: 'store-manager' }),
    ).resolves.toMatchObject({
      positionCodes: ['ALL', 'FOH', 'BOH', 'CASH', 'SM', 'RM', 'HOLDING'],
      summary: {
        requiredTotal: 7,
        requiredCompleted: 0,
        completionPercent: 0,
      },
    });
    expect(prismaService.trainingMaterial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          positionId: {
            in: ['ALL', 'FOH', 'BOH', 'CASH', 'SM', 'RM', 'HOLDING'],
          },
        },
      }),
    );
  });

  it('summarizes required store training progress for the viewer restaurant', async () => {
    const { service, prismaService } = createService();

    prismaService.trainingPosition.findMany.mockResolvedValue([
      {
        code: 'ALL',
        nameZh: '全岗通用',
        nameEn: 'All',
        nameFr: 'Tous',
        parentCode: null,
        isActive: true,
        sortOrder: 0,
      },
      {
        code: 'FOH',
        nameZh: '前厅',
        nameEn: 'Front of House',
        nameFr: 'Salle',
        parentCode: null,
        isActive: true,
        sortOrder: 10,
      },
      {
        code: 'BOH',
        nameZh: '后厨',
        nameEn: 'Back of House',
        nameFr: 'Cuisine',
        parentCode: null,
        isActive: true,
        sortOrder: 20,
      },
    ]);
    prismaService.trainingMaterial.findMany.mockResolvedValue([
      buildMaterialRow({ id: 1, positionId: 'FOH', isRequired: true }),
      buildMaterialRow({ id: 2, positionId: 'ALL', isRequired: true }),
      buildMaterialRow({ id: 3, positionId: 'BOH', isRequired: true }),
    ]);
    prismaService.user.findMany.mockResolvedValue([
      {
        id: 10,
        name: 'Lina Zhao',
        email: 'lina@example.com',
        jobRole: 'front-of-house',
      },
      {
        id: 11,
        name: 'Ming Zhao',
        email: 'ming@example.com',
        jobRole: 'back-of-house',
      },
    ]);
    prismaService.trainingMaterialProgress.findMany.mockResolvedValue([
      {
        userId: 10,
        materialId: 1,
        status: 'completed',
        progressPct: 100,
        lastOpenedAt: new Date('2026-05-05T08:00:00.000Z'),
        completedAt: new Date('2026-05-05T08:00:00.000Z'),
      },
      {
        userId: 10,
        materialId: 2,
        status: 'completed',
        progressPct: 100,
        lastOpenedAt: new Date('2026-05-05T09:00:00.000Z'),
        completedAt: new Date('2026-05-05T09:00:00.000Z'),
      },
      {
        userId: 11,
        materialId: 2,
        status: 'completed',
        progressPct: 100,
        lastOpenedAt: new Date('2026-05-05T10:00:00.000Z'),
        completedAt: new Date('2026-05-05T10:00:00.000Z'),
      },
    ]);

    await expect(
      service.getStoreProgress({
        id: 7,
        jobRole: 'store-manager',
        restaurantId: 3,
        store: { id: 3, name: 'Paris Opera' },
        permissions: [],
      }),
    ).resolves.toMatchObject({
      restaurant: { id: 3, name: 'Paris Opera' },
      users: [
        {
          userId: 10,
          requiredTotal: 2,
          requiredCompleted: 2,
          completionPercent: 100,
          lastOpenedAt: '2026-05-05T09:00:00.000Z',
        },
        {
          userId: 11,
          requiredTotal: 2,
          requiredCompleted: 1,
          completionPercent: 50,
          lastOpenedAt: '2026-05-05T10:00:00.000Z',
        },
      ],
      summary: {
        employeeCount: 2,
        completedEmployeeCount: 1,
        averageCompletionPercent: 75,
      },
    });
    expect(prismaService.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { restaurantId: 3 },
      }),
    );
  });

  it('rejects store progress access without a manager role or permission', async () => {
    const { service } = createService();

    await expect(
      service.getStoreProgress({
        id: 7,
        jobRole: 'front-of-house',
        restaurantId: 3,
        store: { id: 3, name: 'Paris Opera' },
        permissions: [],
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('rejects store progress access for holding users', async () => {
    const { service } = createService();

    await expect(
      service.getStoreProgress({
        id: 7,
        jobRole: 'holding',
        restaurantId: 99,
        store: { id: 99, name: 'ZHAO Holding' },
        permissions: ['training.progress.view_store'],
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  describe('job-role position mapping', () => {
    it('upserts a mapping after validating the role and position', async () => {
      const { service, prismaService } = createService();
      prismaService.trainingPosition.findUnique.mockResolvedValue({
        isActive: true,
      });
      prismaService.trainingJobRolePosition.upsert.mockResolvedValue({
        jobRole: 'front-host',
        positionCode: 'FRONT_HOST',
        includeDescendants: false,
        grantsAllPositions: false,
      });

      const result = await service.upsertJobRolePosition('front-host', {
        positionCode: 'FRONT_HOST',
      });

      expect(result.positionCode).toBe('FRONT_HOST');
      const [upsertArg] = prismaService.trainingJobRolePosition.upsert.mock
        .calls[0] as [{ create: Record<string, unknown> }];
      expect(upsertArg.create).toMatchObject({
        jobRole: 'front-host',
        positionCode: 'FRONT_HOST',
        includeDescendants: false,
        grantsAllPositions: false,
      });
    });

    it('rejects an unknown job role', async () => {
      const { service } = createService();

      await expect(
        service.upsertJobRolePosition('not-a-role', {
          positionCode: 'FRONT_HOST',
        }),
      ).rejects.toThrow('INVALID_JOB_ROLE');
    });

    it('rejects a position that is missing or inactive', async () => {
      const { service, prismaService } = createService();
      prismaService.trainingPosition.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertJobRolePosition('front-host', { positionCode: 'GHOST' }),
      ).rejects.toThrow('TRAINING_POSITION_NOT_FOUND');
    });

    it('deletes an existing mapping', async () => {
      const { service, prismaService } = createService();
      prismaService.trainingJobRolePosition.findUnique.mockResolvedValue({
        jobRole: 'front-host',
      });
      prismaService.trainingJobRolePosition.delete.mockResolvedValue({});

      await expect(
        service.deleteJobRolePosition('front-host'),
      ).resolves.toEqual({ message: 'TRAINING_JOB_ROLE_POSITION_DELETED' });
    });

    it('throws when deleting a mapping that does not exist', async () => {
      const { service, prismaService } = createService();
      prismaService.trainingJobRolePosition.findUnique.mockResolvedValue(null);

      await expect(service.deleteJobRolePosition('front-host')).rejects.toThrow(
        'TRAINING_JOB_ROLE_POSITION_NOT_FOUND',
      );
    });
  });
});

function buildMaterialRow(overrides: {
  id: number;
  positionId: string;
  isRequired: boolean;
}) {
  return {
    id: overrides.id,
    positionId: overrides.positionId,
    type: 'VIDEO',
    isRequired: overrides.isRequired,
    title: `Training ${overrides.id}`,
    description: null,
    originalName: `training-${overrides.id}.mp4`,
    mimeType: 'video/mp4',
    sizeBytes: BigInt(120),
    bucket: 'company-private-files',
    objectKey: `training/${overrides.id}.mp4`,
    createdAt: new Date('2026-04-27T08:00:00.000Z'),
    updatedAt: new Date('2026-04-27T08:00:00.000Z'),
  };
}
