import { NotFoundException } from '@nestjs/common';
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
      },
      trainingPosition: {
        create: jest.fn(),
        update: jest.fn(),
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
      $transaction: jest.fn(
        (callback: (tx: { userRole: typeof userRole }) => unknown) =>
          Promise.resolve(callback({ userRole })),
      ),
    };
    const mediaService = {
      deleteFile: jest.fn(),
    };

    return {
      prismaService,
      mediaService,
      service: new TrainingService(
        prismaService as never,
        mediaService as never,
      ),
    };
  }

  const service = createService().service;

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
});
