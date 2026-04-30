import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';

type FindUniqueUserArgs = {
  where: {
    email: string;
  };
  select: {
    id: true;
  };
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
  select: {
    id: true;
  };
};

describe('AuthService', () => {
  function createService(options?: { existingUser?: { id: number } | null }) {
    const findUnique = jest.fn<
      Promise<{ id: number } | null>,
      [FindUniqueUserArgs]
    >();
    const create = jest.fn<Promise<{ id: number }>, [CreateUserArgs]>();
    const ensureRestaurantExists = jest.fn<Promise<void>, [number]>();

    findUnique.mockResolvedValue(options?.existingUser ?? null);
    create.mockResolvedValue({ id: 7 });
    ensureRestaurantExists.mockResolvedValue(undefined);
    const prismaService = {
      user: {
        findUnique,
        create,
      },
    };
    const restaurantsService = {
      ensureRestaurantExists,
    };

    return {
      prismaService,
      restaurantsService,
      authService: new AuthService(
        prismaService as never,
        restaurantsService as never,
        {} as never,
      ),
    };
  }

  it('creates a user from the registration payload', async () => {
    const { authService, prismaService, restaurantsService } = createService();

    const result = await authService.register({
      familyName: 'Zhao',
      givenName: 'Lina',
      email: '  LINA@EXAMPLE.COM ',
      password: 'password123',
      restaurantId: 3,
      birthday: '1995-03-01',
      jobRole: 'front-of-house',
      profilePhotoDataUrl: 'data:image/png;base64,abc123',
      acceptedTerms: true,
      language: 'fr',
    });

    expect(restaurantsService.ensureRestaurantExists).toHaveBeenCalledWith(3);
    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'lina@example.com',
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
      restaurantId: 3,
      birthday: new Date('1995-03-01T00:00:00.000Z'),
      jobRole: 'front-of-house',
      profilePhoto: 'data:image/png;base64,abc123',
      userLevel: 0,
      acceptedTerms: true,
      preferredLanguage: 'fr',
    });
    expect(createCall[0].data.passwordHash).toMatch(/^scrypt\$/);
    expect(createCall[0].select).toEqual({
      id: true,
    });
    expect(result).toEqual({
      message: 'REGISTRATION_SAVED',
      userId: 7,
    });
  });

  it('rejects registration when terms are not accepted', async () => {
    const { authService } = createService();

    await expect(
      authService.register({
        familyName: 'Zhao',
        givenName: 'Lina',
        email: 'lina@example.com',
        password: 'password123',
        restaurantId: 3,
        acceptedTerms: false,
        language: 'fr',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate emails', async () => {
    const { authService } = createService({
      existingUser: { id: 2 },
    });

    await expect(
      authService.register({
        familyName: 'Zhao',
        givenName: 'Lina',
        email: 'lina@example.com',
        password: 'password123',
        restaurantId: 3,
        acceptedTerms: true,
        language: 'fr',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
