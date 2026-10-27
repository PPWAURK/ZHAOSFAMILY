import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RECRUITMENT_REQUEST_PERMISSIONS } from '../auth/permissions';
import { RecruitmentRequestsService } from './recruitment-requests.service';

const STORE_ACTOR = {
  id: 7,
  restaurantId: 2,
  permissions: [],
};

const HQ_ACTOR = {
  id: 1,
  restaurantId: 99,
  permissions: [RECRUITMENT_REQUEST_PERMISSIONS.manage],
};

const REQUEST_RECORD = {
  id: 11,
  restaurantId: 2,
  restaurant: { id: 2, name: 'ZHAO Store' },
  createdByUserId: 7,
  createdByUser: { id: 7, name: 'Store Manager', email: 'store@zhao.test' },
  contractType: 'full_time',
  position: 'waiter',
  headcount: 2,
  notes: 'Weekend shift',
  status: 'pending',
  isPublished: false,
  handledNotes: null,
  handledByUserId: null,
  handledByUser: null,
  handledAt: null,
  createdAt: new Date('2026-06-05T10:00:00.000Z'),
  updatedAt: new Date('2026-06-05T10:00:00.000Z'),
};

const REQUEST_INCLUDES = {
  restaurant: { select: { id: true, name: true } },
  createdByUser: { select: { id: true, name: true, email: true } },
  handledByUser: { select: { id: true, name: true, email: true } },
};

const ANY_DATE = expect.any(Date) as unknown as Date;

function createPrismaServiceMock() {
  return {
    user: { findMany: jest.fn().mockResolvedValue([]) },
    recruitmentRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

function createNotificationsServiceMock() {
  return { sendToUsers: jest.fn() };
}

function createService(
  prismaService: ReturnType<typeof createPrismaServiceMock>,
  notificationsService = createNotificationsServiceMock(),
): RecruitmentRequestsService {
  return new RecruitmentRequestsService(
    prismaService as never,
    notificationsService as never,
  );
}

describe('RecruitmentRequestsService', () => {
  it('creates a recruitment request for the actor store', async () => {
    const prismaService = createPrismaServiceMock();
    const notificationsService = createNotificationsServiceMock();
    prismaService.user.findMany.mockResolvedValue([
      { id: 21, preferredLanguage: 'fr' },
      { id: 22, preferredLanguage: 'en' },
    ]);
    prismaService.recruitmentRequest.create.mockResolvedValue(REQUEST_RECORD);
    const service = createService(prismaService, notificationsService);

    const result = await service.createRequest(STORE_ACTOR, {
      contractType: 'full_time',
      position: 'waiter',
      headcount: 2,
      notes: '  Weekend shift  ',
    });

    expect(prismaService.recruitmentRequest.create).toHaveBeenCalledWith({
      data: {
        restaurantId: STORE_ACTOR.restaurantId,
        createdByUserId: STORE_ACTOR.id,
        contractType: 'full_time',
        position: 'waiter',
        headcount: 2,
        notes: 'Weekend shift',
      },
      include: REQUEST_INCLUDES,
    });
    expect(result).toMatchObject({
      id: REQUEST_RECORD.id,
      restaurantId: REQUEST_RECORD.restaurantId,
      restaurantName: REQUEST_RECORD.restaurant.name,
      contractType: 'full_time',
      position: 'waiter',
      headcount: 2,
    });
    expect(prismaService.user.findMany).toHaveBeenCalledWith({
      where: {
        accountStatus: 'approved',
        userRoles: {
          some: { role: { name: 'recruitment-notification-recipient' } },
        },
      },
      select: { id: true, preferredLanguage: true },
    });
    expect(notificationsService.sendToUsers).toHaveBeenNthCalledWith(1, [21], {
      title: 'Une boutique cherche de nouveaux collègues',
      body: 'ZHAO Store souhaite pourvoir 2 postes de serveur. Consultez sa demande quand vous le pouvez.',
      data: { type: 'recruitment-request', recruitmentRequestId: '11' },
    });
    expect(notificationsService.sendToUsers).toHaveBeenNthCalledWith(2, [22], {
      title: 'A store is looking for new teammates',
      body: 'ZHAO Store is looking for 2 waiters. Take a look at the request when you can.',
      data: { type: 'recruitment-request', recruitmentRequestId: '11' },
    });
  });

  it('does not fail request creation when holding notification delivery fails', async () => {
    const prismaService = createPrismaServiceMock();
    const notificationsService = createNotificationsServiceMock();
    prismaService.recruitmentRequest.create.mockResolvedValue(REQUEST_RECORD);
    prismaService.user.findMany.mockResolvedValue([
      { id: 21, preferredLanguage: 'fr' },
    ]);
    notificationsService.sendToUsers.mockRejectedValueOnce(
      new Error('push unavailable'),
    );
    const service = createService(prismaService, notificationsService);

    await expect(
      service.createRequest(STORE_ACTOR, {
        contractType: 'full_time',
        position: 'waiter',
        headcount: 2,
      }),
    ).resolves.toMatchObject({ id: REQUEST_RECORD.id });
  });

  it('limits regular users to their own restaurant requests', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.recruitmentRequest.findMany.mockResolvedValue([
      REQUEST_RECORD,
    ]);
    const service = createService(prismaService);

    await service.listRequests(STORE_ACTOR, {});

    expect(prismaService.recruitmentRequest.findMany).toHaveBeenCalledWith({
      where: { restaurantId: STORE_ACTOR.restaurantId },
      include: REQUEST_INCLUDES,
      orderBy: { createdAt: 'desc' },
      take: 120,
    });
  });

  it('allows headquarters users to list all requests with a status filter', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.recruitmentRequest.findMany.mockResolvedValue([
      REQUEST_RECORD,
    ]);
    const service = createService(prismaService);

    await service.listRequests(HQ_ACTOR, { status: 'pending' });

    expect(prismaService.recruitmentRequest.findMany).toHaveBeenCalledWith({
      where: { status: 'pending' },
      include: REQUEST_INCLUDES,
      orderBy: { createdAt: 'desc' },
      take: 120,
    });
  });

  it('lists only public opening fields from published, unfinished requests', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.recruitmentRequest.findMany.mockResolvedValue([
      {
        id: REQUEST_RECORD.id,
        position: REQUEST_RECORD.position,
        contractType: REQUEST_RECORD.contractType,
        headcount: REQUEST_RECORD.headcount,
        restaurant: { address: '10 rue de Rivoli, 75004 Paris' },
      },
    ]);
    const service = createService(prismaService);

    const result = await service.listPublicOpenings();

    expect(prismaService.recruitmentRequest.findMany).toHaveBeenCalledWith({
      where: { isPublished: true, status: { not: 'completed' } },
      select: {
        id: true,
        position: true,
        contractType: true,
        headcount: true,
        restaurant: { select: { address: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([
      {
        id: REQUEST_RECORD.id,
        address: '10 rue de Rivoli, 75004 Paris',
        position: 'waiter',
        contractType: 'full_time',
        headcount: 2,
      },
    ]);
  });

  it('rejects updates from users without recruitment management permission', async () => {
    const prismaService = createPrismaServiceMock();
    const service = createService(prismaService);

    await expect(
      service.updateRequest(STORE_ACTOR, REQUEST_RECORD.id, {
        status: 'in_progress',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when headquarters updates a missing request', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.recruitmentRequest.findUnique.mockResolvedValue(null);
    const service = createService(prismaService);

    await expect(
      service.updateRequest(HQ_ACTOR, REQUEST_RECORD.id, {
        status: 'in_progress',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects publishing a completed request', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.recruitmentRequest.findUnique.mockResolvedValue({
      id: REQUEST_RECORD.id,
      status: 'completed',
    });
    const service = createService(prismaService);

    await expect(
      service.updateRequest(HQ_ACTOR, REQUEST_RECORD.id, {
        isPublished: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.recruitmentRequest.update).not.toHaveBeenCalled();
  });

  it('allows headquarters to publish an unfinished request', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.recruitmentRequest.findUnique.mockResolvedValue({
      id: REQUEST_RECORD.id,
      status: 'pending',
    });
    prismaService.recruitmentRequest.update.mockResolvedValue({
      ...REQUEST_RECORD,
      isPublished: true,
    });
    const service = createService(prismaService);

    const result = await service.updateRequest(HQ_ACTOR, REQUEST_RECORD.id, {
      isPublished: true,
    });

    expect(prismaService.recruitmentRequest.update).toHaveBeenCalledWith({
      where: { id: REQUEST_RECORD.id },
      data: { isPublished: true },
      include: REQUEST_INCLUDES,
    });
    expect(result.isPublished).toBe(true);
  });

  it('records the handler when a request is completed', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.recruitmentRequest.findUnique.mockResolvedValue({
      id: 11,
      status: 'pending',
    });
    prismaService.recruitmentRequest.update.mockResolvedValue({
      ...REQUEST_RECORD,
      status: 'completed',
      isPublished: false,
      handledNotes: 'Assigned to HR',
      handledByUserId: HQ_ACTOR.id,
      handledByUser: {
        id: HQ_ACTOR.id,
        name: 'HQ Admin',
        email: 'hq@zhao.test',
      },
      handledAt: new Date('2026-06-05T11:00:00.000Z'),
    });
    const service = createService(prismaService);

    const result = await service.updateRequest(HQ_ACTOR, REQUEST_RECORD.id, {
      status: 'completed',
      handledNotes: ' Assigned to HR ',
    });

    expect(prismaService.recruitmentRequest.update).toHaveBeenCalledWith({
      where: { id: REQUEST_RECORD.id },
      data: {
        status: 'completed',
        isPublished: false,
        handledNotes: 'Assigned to HR',
        handledByUserId: HQ_ACTOR.id,
        handledAt: ANY_DATE,
      },
      include: REQUEST_INCLUDES,
    });
    expect(result.status).toBe('completed');
    expect(result.handledBy?.id).toBe(HQ_ACTOR.id);
  });
});
