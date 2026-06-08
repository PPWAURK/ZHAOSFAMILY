import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
    recruitmentRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('RecruitmentRequestsService', () => {
  it('creates a recruitment request for the actor store', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.recruitmentRequest.create.mockResolvedValue(REQUEST_RECORD);
    const service = new RecruitmentRequestsService(prismaService as never);

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
  });

  it('limits regular users to their own restaurant requests', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.recruitmentRequest.findMany.mockResolvedValue([
      REQUEST_RECORD,
    ]);
    const service = new RecruitmentRequestsService(prismaService as never);

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
    const service = new RecruitmentRequestsService(prismaService as never);

    await service.listRequests(HQ_ACTOR, { status: 'pending' });

    expect(prismaService.recruitmentRequest.findMany).toHaveBeenCalledWith({
      where: { status: 'pending' },
      include: REQUEST_INCLUDES,
      orderBy: { createdAt: 'desc' },
      take: 120,
    });
  });

  it('rejects updates from users without recruitment management permission', async () => {
    const prismaService = createPrismaServiceMock();
    const service = new RecruitmentRequestsService(prismaService as never);

    await expect(
      service.updateRequest(STORE_ACTOR, REQUEST_RECORD.id, {
        status: 'in_progress',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when headquarters updates a missing request', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.recruitmentRequest.findUnique.mockResolvedValue(null);
    const service = new RecruitmentRequestsService(prismaService as never);

    await expect(
      service.updateRequest(HQ_ACTOR, REQUEST_RECORD.id, {
        status: 'in_progress',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('records the handler when a request is completed', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.recruitmentRequest.findUnique.mockResolvedValue({ id: 11 });
    prismaService.recruitmentRequest.update.mockResolvedValue({
      ...REQUEST_RECORD,
      status: 'completed',
      handledNotes: 'Assigned to HR',
      handledByUserId: HQ_ACTOR.id,
      handledByUser: {
        id: HQ_ACTOR.id,
        name: 'HQ Admin',
        email: 'hq@zhao.test',
      },
      handledAt: new Date('2026-06-05T11:00:00.000Z'),
    });
    const service = new RecruitmentRequestsService(prismaService as never);

    const result = await service.updateRequest(HQ_ACTOR, REQUEST_RECORD.id, {
      status: 'completed',
      handledNotes: ' Assigned to HR ',
    });

    expect(prismaService.recruitmentRequest.update).toHaveBeenCalledWith({
      where: { id: REQUEST_RECORD.id },
      data: {
        status: 'completed',
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
