import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type HealthResponseBody = {
  status: 'ok';
  database: 'up';
  timestamp: string;
};

type ErrorResponseBody = {
  message: string;
};

type RestaurantListItem = {
  id: number;
  name: string;
  address: string;
  photoUrl: string | null;
};

type SupplierListItem = {
  id: number;
  name: string;
  sortOrder: number;
  includeAllProductsInOrder: boolean;
};

type ProductListItem = {
  id: string;
  supplierId: number;
  reference: string | null;
  category: string;
  nameCn: string;
  designationFr: string | null;
  unit: string | null;
  unitPriceHt: number | null;
  image: string | null;
  specification: string | null;
  specification2: string | null;
  specification3: string | null;
  unit2: string | null;
  unit3: string | null;
  unitPriceHt2: number | null;
  unitPriceHt3: number | null;
};

type CreateUserArgs = {
  data: {
    familyName: string;
    givenName: string;
    name: string;
    email: string;
    emailVerified: boolean;
    passwordHash: string;
    restaurantId: number;
    birthday: Date | null;
    jobRole: string | null;
    profilePhoto: string | null;
    userLevel: number;
    acceptedTerms: boolean;
    preferredLanguage: 'zh' | 'en' | 'fr';
  };
  include: {
    restaurant: {
      select: {
        id: true;
        name: true;
        address: true;
        photoUrl: true;
      };
    };
  };
};

type RefreshSessionCreateCall = {
  data: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  };
};

function createPrismaServiceMock() {
  return {
    $queryRawUnsafe: jest.fn().mockResolvedValue([{ value: 1 }]),
    restaurant: {
      findUnique: jest.fn().mockResolvedValue({ id: 1 }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          name: 'Paris Opera',
          address: '10 Rue Example',
          photoUrl: '/uploads/paris-opera.jpg',
        },
      ]),
    },
    supplier: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          name: 'ZHAO Labo',
          sortOrder: 1,
          includeAllProductsInOrder: true,
        },
      ]),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: BigInt(1),
          supplierId: 1,
          reference: 'VEG-001',
          category: 'frais',
          nameCn: '上海小白菜',
          designationFr: 'Choux Shanghai',
          unit: '箱',
          unitPriceHt: { toString: () => '3.30' },
          image: null,
          specification: '8KG',
          specification2: null,
          specification3: null,
          unit2: null,
          unit3: null,
          unitPriceHt2: null,
          unitPriceHt3: null,
        },
      ]),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 9,
        familyName: 'Zhao',
        givenName: 'Lina',
        name: 'Zhao Lina',
        email: 'lina@example.com',
        emailVerified: false,
        restaurantId: 1,
        restaurant: {
          id: 1,
          name: 'Paris Opera',
          address: '10 Rue Example',
          photoUrl: '/uploads/paris-opera.jpg',
        },
        birthday: new Date('1995-03-01T00:00:00.000Z'),
        jobRole: 'front-of-house',
        phone: null,
        address: null,
        profilePhoto: 'data:image/png;base64,abc123',
        userLevel: 7,
        preferredLanguage: 'fr',
      }),
    },
    refreshSession: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ id: 1 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    userRole: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

async function createTestApp(
  prismaService: ReturnType<typeof createPrismaServiceMock>,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaService)
    .compile();

  const nestApplication = moduleRef.createNestApplication();

  nestApplication.setGlobalPrefix('api');
  nestApplication.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await nestApplication.init();

  return nestApplication;
}

describe('API endpoints (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns 200 when the database ping succeeds', async () => {
    const prismaService = createPrismaServiceMock();
    app = await createTestApp(prismaService);

    const httpTarget = app.getHttpAdapter().getInstance() as Parameters<
      typeof request
    >[0];
    const response: Response = await request(httpTarget).get('/api/health');
    const body = response.body as HealthResponseBody;

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('up');
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it('returns 503 when the database ping fails', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.$queryRawUnsafe.mockRejectedValue(new Error('offline'));
    app = await createTestApp(prismaService);

    const httpTarget = app.getHttpAdapter().getInstance() as Parameters<
      typeof request
    >[0];
    const response: Response = await request(httpTarget).get('/api/health');
    const body = response.body as ErrorResponseBody;

    expect(response.status).toBe(503);
    expect(body.message).toBe('Database unavailable');
  });

  it('returns the restaurants list', async () => {
    const prismaService = createPrismaServiceMock();
    app = await createTestApp(prismaService);

    const httpTarget = app.getHttpAdapter().getInstance() as Parameters<
      typeof request
    >[0];
    const response: Response =
      await request(httpTarget).get('/api/restaurants');
    const body = response.body as RestaurantListItem[];

    expect(response.status).toBe(200);
    expect(prismaService.restaurant.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        address: true,
        photoUrl: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
    expect(body).toEqual([
      {
        id: 1,
        name: 'Paris Opera',
        address: '10 Rue Example',
        photoUrl: '/uploads/paris-opera.jpg',
      },
    ]);
  });

  it('returns the suppliers list', async () => {
    const prismaService = createPrismaServiceMock();
    app = await createTestApp(prismaService);

    const httpTarget = app.getHttpAdapter().getInstance() as Parameters<
      typeof request
    >[0];
    const response: Response = await request(httpTarget).get('/api/suppliers');
    const body = response.body as SupplierListItem[];

    expect(response.status).toBe(200);
    expect(prismaService.supplier.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        sortOrder: true,
        includeAllProductsInOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    expect(body).toEqual([
      {
        id: 1,
        name: 'ZHAO Labo',
        sortOrder: 1,
        includeAllProductsInOrder: true,
      },
    ]);
  });

  it('returns the products list for one supplier', async () => {
    const prismaService = createPrismaServiceMock();
    app = await createTestApp(prismaService);

    const httpTarget = app.getHttpAdapter().getInstance() as Parameters<
      typeof request
    >[0];
    const response: Response = await request(httpTarget).get(
      '/api/products?supplierId=1',
    );
    const body = response.body as ProductListItem[];

    expect(response.status).toBe(200);
    expect(prismaService.product.findMany).toHaveBeenCalledWith({
      where: {
        supplierId: 1,
      },
      select: {
        id: true,
        supplierId: true,
        reference: true,
        category: true,
        nameCn: true,
        designationFr: true,
        unit: true,
        unitPriceHt: true,
        image: true,
        specification: true,
        specification2: true,
        specification3: true,
        unit2: true,
        unit3: true,
        unitPriceHt2: true,
        unitPriceHt3: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
    expect(body).toEqual([
      {
        id: '1',
        supplierId: 1,
        reference: 'VEG-001',
        category: 'frais',
        nameCn: '上海小白菜',
        designationFr: 'Choux Shanghai',
        unit: '箱',
        unitPriceHt: 3.3,
        image: null,
        specification: '8KG',
        specification2: null,
        specification3: null,
        unit2: null,
        unit3: null,
        unitPriceHt2: null,
        unitPriceHt3: null,
      },
    ]);
  });

  it('registers a user without a birthday', async () => {
    const prismaService = createPrismaServiceMock();
    app = await createTestApp(prismaService);

    const httpTarget = app.getHttpAdapter().getInstance() as Parameters<
      typeof request
    >[0];
    const response: Response = await request(httpTarget)
      .post('/api/auth/register')
      .send({
        familyName: 'Zhao',
        givenName: 'Lina',
        email: 'lina@example.com',
        password: 'password123',
        restaurantId: 1,
        jobRole: 'front-of-house',
        profilePhotoDataUrl: 'data:image/png;base64,abc123',
        level: 7,
        acceptedTerms: true,
        language: 'fr',
      });

    expect(response.status).toBe(201);
    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'lina@example.com',
      },
      select: {
        id: true,
      },
    });
    expect(prismaService.restaurant.findUnique).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      select: {
        id: true,
      },
    });
    expect(prismaService.user.create).toHaveBeenCalledTimes(1);
    const [createCall] = prismaService.user.create.mock.calls as [
      [CreateUserArgs],
    ];
    expect(createCall[0].data).toMatchObject({
      familyName: 'Zhao',
      givenName: 'Lina',
      name: 'Zhao Lina',
      email: 'lina@example.com',
      emailVerified: false,
      restaurantId: 1,
      birthday: null,
      jobRole: 'front-of-house',
      profilePhoto: 'data:image/png;base64,abc123',
      userLevel: 7,
      acceptedTerms: true,
      preferredLanguage: 'fr',
    });
    expect(createCall[0].data.passwordHash).toMatch(/^scrypt\$/);
    expect(createCall[0].include).toEqual({
      restaurant: {
        select: {
          id: true,
          name: true,
          address: true,
          photoUrl: true,
        },
      },
    });
    expect(prismaService.refreshSession.create).toHaveBeenCalledTimes(1);
    const [refreshSessionCreateCall] = prismaService.refreshSession.create.mock
      .calls[0] as [RefreshSessionCreateCall];
    expect(refreshSessionCreateCall.data.userId).toBe(9);
    expect(refreshSessionCreateCall.data.tokenHash).toHaveLength(64);
    expect(refreshSessionCreateCall.data.expiresAt).toBeInstanceOf(Date);

    const body = response.body as {
      accessToken: string;
      refreshToken: string;
      user: {
        id: number;
        email: string;
        storeName: string;
      };
    };
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
    expect(body.user).toMatchObject({
      id: 9,
      email: 'lina@example.com',
      storeName: 'Paris Opera',
    });
  });

  it('rejects a user level above 7', async () => {
    const prismaService = createPrismaServiceMock();
    app = await createTestApp(prismaService);

    const httpTarget = app.getHttpAdapter().getInstance() as Parameters<
      typeof request
    >[0];
    const response: Response = await request(httpTarget)
      .post('/api/auth/register')
      .send({
        familyName: 'Zhao',
        givenName: 'Lina',
        email: 'lina@example.com',
        password: 'password123',
        restaurantId: 1,
        level: 8,
        acceptedTerms: true,
        language: 'fr',
      });
    const body = response.body as {
      message: string[];
    };

    expect(response.status).toBe(400);
    expect(prismaService.user.create).not.toHaveBeenCalled();
    expect(body.message).toContain('INVALID_USER_LEVEL');
  });

  it('rejects a products request without a supplier id', async () => {
    const prismaService = createPrismaServiceMock();
    app = await createTestApp(prismaService);

    const httpTarget = app.getHttpAdapter().getInstance() as Parameters<
      typeof request
    >[0];
    const response: Response = await request(httpTarget).get('/api/products');
    const body = response.body as {
      message: string[];
    };

    expect(response.status).toBe(400);
    expect(prismaService.product.findMany).not.toHaveBeenCalled();
    expect(body.message).toContain('INVALID_SUPPLIER_ID');
  });
});
