import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';

type FindUniqueUserArgs = {
  where: {
    email: string;
  };
  select:
    | {
        id: true;
      }
    | {
        id: true;
        preferredLanguage: true;
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

type UpdateUserCall = {
  where: {
    id: number;
  };
  data: Record<string, unknown>;
};

type PasswordResetMailCall = {
  email: string;
  language: string;
  resetUrl: string;
};

describe('AuthService', () => {
  function createService(options?: {
    existingUser?: { id: number } | null;
    passwordResetDebug?: boolean;
  }) {
    const findUnique = jest.fn<
      Promise<{ id: number } | null>,
      [FindUniqueUserArgs]
    >();
    const create = jest.fn<
      Promise<Record<string, unknown>>,
      [CreateUserArgs]
    >();
    const findFirst = jest.fn();
    const update = jest.fn();
    const createRefreshSession = jest.fn();
    const updateManyRefreshSessions = jest.fn();
    const findUniqueRefreshSession = jest.fn();
    const updateRefreshSession = jest.fn();
    const findManyUserRoles = jest.fn();
    const ensureRestaurantExists = jest.fn<Promise<void>, [number]>();
    const sendResetPasswordEmail = jest.fn<
      Promise<void>,
      [PasswordResetMailCall]
    >();

    findUnique.mockResolvedValue(options?.existingUser ?? null);
    create.mockResolvedValue({
      id: 7,
      familyName: 'Zhao',
      givenName: 'Lina',
      name: 'Zhao Lina',
      email: 'lina@example.com',
      emailVerified: false,
      restaurantId: 3,
      restaurant: {
        id: 3,
        name: 'ZHAO Test',
        address: '1 Rue Test',
        photoUrl: null,
      },
      birthday: new Date('1995-03-01T00:00:00.000Z'),
      jobRole: 'front-of-house',
      phone: null,
      address: null,
      profilePhoto: 'data:image/png;base64,abc123',
      userLevel: 0,
      preferredLanguage: 'fr',
    });
    createRefreshSession.mockResolvedValue({ id: 1 });
    findManyUserRoles.mockResolvedValue([]);
    ensureRestaurantExists.mockResolvedValue(undefined);
    const prismaService = {
      user: {
        findUnique,
        findFirst,
        create,
        update,
      },
      refreshSession: {
        create: createRefreshSession,
        findUnique: findUniqueRefreshSession,
        update: updateRefreshSession,
        updateMany: updateManyRefreshSessions,
      },
      userRole: {
        findMany: findManyUserRoles,
      },
    };
    const restaurantsService = {
      ensureRestaurantExists,
    };
    const configService = {
      get: jest.fn((key: string) =>
        key === 'AUTH_TOKEN_SECRET'
          ? 'test-auth-token-secret'
          : key === 'APP_WEB_URL'
            ? 'http://localhost:3000'
            : key === 'PASSWORD_RESET_DEBUG' && options?.passwordResetDebug
              ? 'true'
              : undefined,
      ),
    };
    const mailService = {
      sendResetPasswordEmail,
    };

    return {
      prismaService,
      restaurantsService,
      mailService,
      authService: new AuthService(
        prismaService as never,
        restaurantsService as never,
        configService as never,
        mailService as never,
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
      accountStatus: 'pending',
      restaurantId: 3,
      birthday: new Date('1995-03-01T00:00:00.000Z'),
      jobRole: 'front-of-house',
      profilePhoto: 'data:image/png;base64,abc123',
      userLevel: 0,
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
    // Registration creates a pending account that requires HQ approval;
    // no session is issued until the account is approved.
    expect(prismaService.refreshSession.create).not.toHaveBeenCalled();
    expect(result.message).toBe('REGISTRATION_PENDING_APPROVAL');
    expect(result.user).toMatchObject({
      id: 7,
      email: 'lina@example.com',
      storeName: 'ZHAO Test',
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

  it('stores null birthday when registration sends an empty birthday', async () => {
    const { authService, prismaService } = createService();

    await authService.register({
      familyName: 'Zhao',
      givenName: 'Lina',
      email: 'lina@example.com',
      password: 'password123',
      restaurantId: 3,
      birthday: '',
      acceptedTerms: true,
      language: 'fr',
    });

    const [createCall] = prismaService.user.create.mock.calls as [
      [CreateUserArgs],
    ];
    expect(createCall[0].data.birthday).toBeNull();
  });

  it('rejects invalid birthday instead of passing Invalid Date to Prisma', async () => {
    const { authService, prismaService } = createService();

    await expect(
      authService.register({
        familyName: 'Zhao',
        givenName: 'Lina',
        email: 'lina@example.com',
        password: 'password123',
        restaurantId: 3,
        birthday: 'not-a-date',
        acceptedTerms: true,
        language: 'fr',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.user.create).not.toHaveBeenCalled();
  });

  it('stores only a hashed reset token for existing users', async () => {
    const { authService, prismaService, mailService } = createService();

    prismaService.user.findUnique.mockResolvedValueOnce({
      id: 12,
      preferredLanguage: 'zh',
    });

    await expect(
      authService.forgotPassword({ email: ' USER@EXAMPLE.COM ' }),
    ).resolves.toEqual({
      message: 'PASSWORD_RESET_REQUESTED',
    });

    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
      select: {
        id: true,
        preferredLanguage: true,
      },
    });
    expect(prismaService.user.update).toHaveBeenCalledTimes(1);
    const [updateCall] = prismaService.user.update.mock.calls[0] as [
      UpdateUserCall,
    ];
    expect(updateCall.where).toEqual({ id: 12 });
    expect(updateCall.data.passwordResetTokenHash).toHaveLength(64);
    expect(updateCall.data.passwordResetTokenHash).not.toContain('.');
    expect(updateCall.data.passwordResetExpiresAt).toBeInstanceOf(Date);
    expect(mailService.sendResetPasswordEmail).toHaveBeenCalledTimes(1);
    const [mailCall] = mailService.sendResetPasswordEmail.mock.calls[0];
    expect(mailCall.email).toBe('user@example.com');
    expect(mailCall.language).toBe('zh');
    expect(mailCall.resetUrl).toMatch(
      /^http:\/\/localhost:3000\/reset-password\?token=.+/,
    );
  });

  it('can expose reset URL when local password reset debug is enabled', async () => {
    const { authService, prismaService } = createService({
      passwordResetDebug: true,
    });

    prismaService.user.findUnique.mockResolvedValueOnce({
      id: 12,
      preferredLanguage: 'fr',
    });

    const result = await authService.forgotPassword({
      email: 'user@example.com',
    });

    expect(result.message).toBe('PASSWORD_RESET_REQUESTED');
    expect(result.resetUrl).toMatch(
      /^http:\/\/localhost:3000\/reset-password\?token=.+/,
    );
  });

  it('does not reveal whether a forgot-password email exists', async () => {
    const { authService, prismaService, mailService } = createService();

    prismaService.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      authService.forgotPassword({ email: 'missing@example.com' }),
    ).resolves.toEqual({
      message: 'PASSWORD_RESET_REQUESTED',
    });

    expect(prismaService.user.update).not.toHaveBeenCalled();
    expect(mailService.sendResetPasswordEmail).not.toHaveBeenCalled();
  });

  it('resets password and clears reset token fields', async () => {
    const { authService, prismaService } = createService();
    const token = 'reset-token-with-enough-length';

    prismaService.user.findFirst.mockResolvedValueOnce({
      id: 9,
      passwordResetExpiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      authService.resetPassword({ token, password: 'newPassword123' }),
    ).resolves.toEqual({
      message: 'PASSWORD_RESET',
    });

    expect(prismaService.user.findFirst).toHaveBeenCalledWith({
      where: {
        passwordResetTokenHash: createHash('sha256')
          .update(token)
          .digest('hex'),
      },
      select: {
        id: true,
        passwordResetExpiresAt: true,
      },
    });
    const [updateCall] = prismaService.user.update.mock.calls[0] as [
      UpdateUserCall,
    ];
    expect(updateCall.where).toEqual({ id: 9 });
    expect(updateCall.data.passwordHash).toMatch(/^scrypt\$/);
    expect(updateCall.data.passwordResetTokenHash).toBeNull();
    expect(updateCall.data.passwordResetExpiresAt).toBeNull();
  });

  it('rejects expired reset tokens', async () => {
    const { authService, prismaService } = createService();

    prismaService.user.findFirst.mockResolvedValueOnce({
      id: 9,
      passwordResetExpiresAt: new Date(Date.now() - 60_000),
    });

    await expect(
      authService.resetPassword({
        token: 'expired-reset-token-with-enough-length',
        password: 'newPassword123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a valid invitation and returns a login session', async () => {
    const { authService, prismaService } = createService();
    const token = 'invitation-token-with-enough-length';
    const invitedUser = {
      id: 21,
      familyName: '',
      givenName: '',
      name: '',
      email: 'invitee@example.com',
      emailVerified: false,
      passwordHash: 'pending',
      restaurantId: 3,
      restaurant: {
        id: 3,
        name: 'ZHAO Test',
        address: '1 Rue Test',
        photoUrl: null,
      },
      birthday: null,
      jobRole: null,
      phone: null,
      address: null,
      profilePhoto: null,
      userLevel: 0,
      preferredLanguage: 'fr',
      acceptedTerms: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      invitationTokenHash: createHash('sha256').update(token).digest('hex'),
      invitationExpiresAt: new Date(Date.now() + 60_000),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    };

    prismaService.user.findFirst.mockResolvedValueOnce(invitedUser);
    prismaService.user.update.mockResolvedValueOnce({
      ...invitedUser,
      familyName: 'Zhao Lina',
      name: 'Zhao Lina',
      emailVerified: true,
      invitationTokenHash: null,
      invitationExpiresAt: null,
    });

    const result = await authService.acceptInvitation({
      token,
      name: ' Zhao Lina ',
      password: 'password123',
    });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.user).toMatchObject({
      id: 21,
      name: 'Zhao Lina',
      email: 'invitee@example.com',
      emailVerified: true,
      storeName: 'ZHAO Test',
    });
    const [updateCall] = prismaService.user.update.mock.calls[0] as [
      UpdateUserCall,
    ];
    expect(updateCall.data).toMatchObject({
      familyName: 'Zhao Lina',
      givenName: '',
      name: 'Zhao Lina',
      emailVerified: true,
      invitationTokenHash: null,
      invitationExpiresAt: null,
    });
    expect(updateCall.data.passwordHash).toMatch(/^scrypt\$/);
  });
});
