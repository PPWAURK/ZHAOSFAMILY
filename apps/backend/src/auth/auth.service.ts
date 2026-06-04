import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  createHmac,
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { promisify } from 'node:util';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { MailService } from '../mail/mail.service';
import { ACCOUNT_STATUS } from './account-status';
import type { AccountStatus } from './account-status';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { ChangeCurrentPasswordDto } from './dto/change-current-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';

const scrypt = promisify(scryptCallback);
const SUPPORTED_PROFILE_PHOTO_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;
const DEFAULT_USER_LEVEL = 0;
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 8;
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 30;
const DEFAULT_WEB_APP_URL = 'http://localhost:3000';

export type AuthUser = {
  id: number;
  familyName: string;
  givenName: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  restaurantId: number;
  store: {
    id: number;
    name: string;
    address: string;
    photoUrl: string | null;
  };
  storeName: string;
  jobRole: string | null;
  role: string | null;
  position: string | null;
  birthday: string | null;
  avatar: string | null;
  avatarUrl: string | null;
  phone: string | null;
  address: string | null;
  userLevel: number;
  preferredLanguage: string;
  permissions: string[];
};

export type AuthSessionResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type LoginResponse = AuthSessionResponse;
export type RegisterResponse = {
  message: 'REGISTRATION_PENDING_APPROVAL';
  user: AuthUser;
};

export type ForgotPasswordResponse = {
  message: 'PASSWORD_RESET_REQUESTED';
  resetUrl?: string;
};

type AccessTokenPayload = {
  sub: number;
  exp: number;
};

type AuthUserRecord = {
  id: number;
  familyName: string;
  givenName: string;
  name: string;
  email: string;
  emailVerified: boolean;
  accountStatus: string;
  restaurantId: number;
  restaurant: {
    id: number;
    name: string;
    address: string;
    photoUrl: string | null;
  };
  birthday: Date | null;
  jobRole: string | null;
  phone: string | null;
  address: string | null;
  profilePhoto: string | null;
  userLevel: number;
  preferredLanguage: string;
};

type UserPermissionRecord = {
  role: {
    rolePermissions: {
      permission: {
        key: string;
      };
    }[];
  };
};

type RefreshSessionRecord = {
  id: number;
  userId: number;
  expiresAt: Date;
  revokedAt: Date | null;
};

function buildFullName(familyName: string, givenName: string): string {
  return [familyName, givenName].filter(Boolean).join(' ').trim();
}

function parseOptionalBirthday(birthday: string | undefined): Date | null {
  const normalizedBirthday = birthday?.trim();

  if (!normalizedBirthday) {
    return null;
  }

  const parsedBirthday = new Date(`${normalizedBirthday}T00:00:00.000Z`);

  if (Number.isNaN(parsedBirthday.getTime())) {
    throw new BadRequestException('INVALID_BIRTHDAY');
  }

  return parsedBirthday;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const [scheme, salt, storedKey] = passwordHash.split('$');

  if (scheme !== 'scrypt' || !salt || !storedKey) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(storedKey, 'hex');

  return (
    storedBuffer.length === derivedKey.length &&
    timingSafeEqual(storedBuffer, derivedKey)
  );
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

function hasNotExpired(expiresAt: Date | null): boolean {
  return !!expiresAt && expiresAt.getTime() > Date.now();
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly restaurantsService: RestaurantsService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    const normalizedEmail = registerDto.email.trim().toLowerCase();
    const familyName = registerDto.familyName.trim();
    const givenName = registerDto.givenName.trim();

    if (!registerDto.acceptedTerms) {
      throw new BadRequestException('TERMS_NOT_ACCEPTED');
    }

    if (
      registerDto.profilePhotoDataUrl &&
      !SUPPORTED_PROFILE_PHOTO_PATTERN.test(registerDto.profilePhotoDataUrl)
    ) {
      throw new BadRequestException('INVALID_PROFILE_PHOTO');
    }

    const existingUser = await this.prismaService.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new ConflictException('EMAIL_ALREADY_REGISTERED');
    }

    await this.restaurantsService.ensureRestaurantExists(
      registerDto.restaurantId,
    );

    const birthday = parseOptionalBirthday(registerDto.birthday);
    const passwordHash = await hashPassword(registerDto.password);
    const user = await this.prismaService.user.create({
      data: {
        familyName,
        givenName,
        name: buildFullName(familyName, givenName),
        email: normalizedEmail,
        emailVerified: false,
        accountStatus: ACCOUNT_STATUS.pending,
        accountReviewedAt: null,
        accountReviewedByUserId: null,
        passwordHash,
        restaurantId: registerDto.restaurantId,
        birthday,
        jobRole: registerDto.jobRole ?? null,
        profilePhoto: registerDto.profilePhotoDataUrl ?? null,
        userLevel: registerDto.level ?? DEFAULT_USER_LEVEL,
        acceptedTerms: registerDto.acceptedTerms,
        preferredLanguage: registerDto.language,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            photoUrl: true,
          },
        },
      },
    });

    return {
      message: 'REGISTRATION_PENDING_APPROVAL',
      user: this.toAuthUser(user, []),
    };
  }

  async login(loginDto: LoginDto): Promise<AuthSessionResponse> {
    const normalizedEmail = loginDto.email.trim().toLowerCase();
    const user = await this.prismaService.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            photoUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const passwordMatches = await verifyPassword(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    this.assertApprovedAccount(user.accountStatus);

    return this.createAuthSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthSessionResponse> {
    const session = await this.findValidRefreshSession(refreshToken);

    await this.prismaService.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.findAuthUserById(session.userId);
    this.assertApprovedAccount(user.accountStatus);

    return this.createAuthSession(user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.prismaService.refreshSession.updateMany({
      where: {
        tokenHash: hashOpaqueToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async acceptInvitation(
    dto: AcceptInvitationDto,
  ): Promise<AuthSessionResponse> {
    const invitationTokenHash = hashOpaqueToken(dto.token);
    const invitedUser = await this.prismaService.user.findFirst({
      where: {
        invitationTokenHash,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            photoUrl: true,
          },
        },
      },
    });

    if (!invitedUser || !hasNotExpired(invitedUser.invitationExpiresAt)) {
      throw new BadRequestException('INVALID_INVITATION_TOKEN');
    }

    const normalizedName = dto.name.trim();
    const passwordHash = await hashPassword(dto.password);
    const user = await this.prismaService.user.update({
      where: { id: invitedUser.id },
      data: {
        familyName: normalizedName,
        givenName: '',
        name: normalizedName,
        passwordHash,
        emailVerified: true,
        accountStatus: ACCOUNT_STATUS.approved,
        accountReviewedAt: new Date(),
        accountReviewedByUserId: null,
        invitationTokenHash: null,
        invitationExpiresAt: null,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            photoUrl: true,
          },
        },
      },
    });

    return this.createAuthSession(user);
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prismaService.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        preferredLanguage: true,
      },
    });

    if (user) {
      const resetToken = createOpaqueToken();
      const resetUrl = this.buildPasswordResetUrl(resetToken);
      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          passwordResetTokenHash: hashOpaqueToken(resetToken),
          passwordResetExpiresAt: new Date(
            Date.now() + PASSWORD_RESET_TOKEN_TTL_MS,
          ),
        },
      });
      try {
        await this.mailService.sendResetPasswordEmail({
          email: normalizedEmail,
          language: dto.language ?? user.preferredLanguage,
          resetUrl,
        });
      } catch (error) {
        this.logger.warn(
          `Password reset email failed for ${normalizedEmail}: ${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`,
        );
      }

      if (this.shouldExposePasswordResetDebugUrl()) {
        return {
          message: 'PASSWORD_RESET_REQUESTED',
          resetUrl,
        };
      }
    }

    return { message: 'PASSWORD_RESET_REQUESTED' };
  }

  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<{ message: 'PASSWORD_RESET' }> {
    const passwordResetTokenHash = hashOpaqueToken(dto.token);
    const user = await this.prismaService.user.findFirst({
      where: {
        passwordResetTokenHash,
      },
      select: {
        id: true,
        passwordResetExpiresAt: true,
      },
    });

    if (!user || !hasNotExpired(user.passwordResetExpiresAt)) {
      throw new BadRequestException('INVALID_RESET_TOKEN');
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(dto.password),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return { message: 'PASSWORD_RESET' };
  }

  async getCurrentUser(accessToken: string | undefined): Promise<AuthUser> {
    const payload = this.verifyAccessToken(accessToken);
    const user = await this.findAuthUserById(payload.sub);

    return this.toAuthUser(user, await this.listUserPermissions(user.id));
  }

  private assertApprovedAccount(accountStatus: string): void {
    if (accountStatus === ACCOUNT_STATUS.pending) {
      throw new UnauthorizedException('ACCOUNT_PENDING_APPROVAL');
    }

    if (accountStatus === ACCOUNT_STATUS.rejected) {
      throw new UnauthorizedException('ACCOUNT_REJECTED');
    }

    if (accountStatus !== ACCOUNT_STATUS.approved) {
      throw new UnauthorizedException('ACCOUNT_NOT_APPROVED');
    }
  }

  async updateCurrentUser(
    accessToken: string | undefined,
    dto: UpdateCurrentUserDto,
  ): Promise<AuthUser> {
    const payload = this.verifyAccessToken(accessToken);
    const user = await this.prismaService.user.update({
      where: { id: payload.sub },
      data: {
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.address !== undefined
          ? { address: dto.address.trim() || null }
          : {}),
        ...(dto.profilePhotoDataUrl !== undefined
          ? { profilePhoto: dto.profilePhotoDataUrl.trim() || null }
          : {}),
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            photoUrl: true,
          },
        },
      },
    });

    return this.toAuthUser(user, await this.listUserPermissions(user.id));
  }

  async changeCurrentPassword(
    accessToken: string | undefined,
    dto: ChangeCurrentPasswordDto,
  ): Promise<{ message: 'PASSWORD_CHANGED' }> {
    const payload = this.verifyAccessToken(accessToken);
    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('INVALID_SESSION');
    }

    const passwordMatches = await verifyPassword(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('INVALID_CURRENT_PASSWORD');
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(dto.nextPassword),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return { message: 'PASSWORD_CHANGED' };
  }

  async getPermissionsForToken(
    accessToken: string | undefined,
  ): Promise<string[]> {
    const payload = this.verifyAccessToken(accessToken);

    return this.listUserPermissions(payload.sub);
  }

  private async createAuthSession(
    user: AuthUserRecord,
  ): Promise<AuthSessionResponse> {
    return {
      accessToken: this.signAccessToken({ sub: user.id }),
      refreshToken: await this.createRefreshToken(user.id),
      user: this.toAuthUser(user, await this.listUserPermissions(user.id)),
    };
  }

  private async createRefreshToken(userId: number): Promise<string> {
    const refreshToken = createOpaqueToken();

    await this.prismaService.refreshSession.create({
      data: {
        userId,
        tokenHash: hashOpaqueToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return refreshToken;
  }

  private async findValidRefreshSession(
    refreshToken: string,
  ): Promise<RefreshSessionRecord> {
    const session: RefreshSessionRecord | null =
      await this.prismaService.refreshSession.findUnique({
        where: {
          tokenHash: hashOpaqueToken(refreshToken),
        },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          revokedAt: true,
        },
      });

    if (!session || session.revokedAt || !hasNotExpired(session.expiresAt)) {
      throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
    }

    return session;
  }

  private signAccessToken(payload: { sub: number }): string {
    const tokenPayload: AccessTokenPayload = {
      sub: payload.sub,
      exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
    };
    const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
    const signature = createHmac('sha256', this.getAccessTokenSecret())
      .update(encodedPayload)
      .digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  private verifyAccessToken(
    accessToken: string | undefined,
    options: { allowExpiredWithinSeconds?: number } = {},
  ): AccessTokenPayload {
    if (!accessToken) {
      throw new UnauthorizedException('ACCESS_TOKEN_REQUIRED');
    }

    const [encodedPayload, signature] = accessToken.split('.');
    if (!encodedPayload || !signature) {
      throw new UnauthorizedException('INVALID_ACCESS_TOKEN');
    }

    const expectedSignature = createHmac('sha256', this.getAccessTokenSecret())
      .update(encodedPayload)
      .digest('base64url');

    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      throw new UnauthorizedException('INVALID_ACCESS_TOKEN');
    }

    let payload: AccessTokenPayload;

    try {
      payload = JSON.parse(
        base64UrlDecode(encodedPayload),
      ) as AccessTokenPayload;
    } catch {
      throw new UnauthorizedException('INVALID_ACCESS_TOKEN');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const minAllowedExp = nowSeconds - (options.allowExpiredWithinSeconds ?? 0);

    if (!payload.sub || payload.exp < minAllowedExp) {
      throw new UnauthorizedException('INVALID_ACCESS_TOKEN');
    }

    return payload;
  }

  private async findAuthUserById(userId: number): Promise<AuthUserRecord> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            photoUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('INVALID_ACCESS_TOKEN');
    }

    return user;
  }

  private getAccessTokenSecret(): string {
    const secret = this.configService.get<string>('AUTH_TOKEN_SECRET');

    if (!secret) {
      throw new Error('AUTH_TOKEN_SECRET_REQUIRED');
    }

    return secret;
  }

  private buildPasswordResetUrl(resetToken: string): string {
    const webAppUrl =
      this.configService.get<string>('APP_WEB_URL') || DEFAULT_WEB_APP_URL;
    const normalizedWebAppUrl = webAppUrl.replace(/\/+$/, '');

    return `${normalizedWebAppUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
  }

  private shouldExposePasswordResetDebugUrl(): boolean {
    return this.configService.get<string>('PASSWORD_RESET_DEBUG') === 'true';
  }

  private async listUserPermissions(userId: number): Promise<string[]> {
    const userRoles = (await this.prismaService.userRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            rolePermissions: {
              select: {
                permission: {
                  select: {
                    key: true,
                  },
                },
              },
            },
          },
        },
      },
    })) as UserPermissionRecord[];

    return [
      ...new Set(
        userRoles.flatMap((userRole) =>
          userRole.role.rolePermissions.map(
            (rolePermission) => rolePermission.permission.key,
          ),
        ),
      ),
    ].sort();
  }

  private toAuthUser(user: AuthUserRecord, permissions: string[]): AuthUser {
    return {
      id: user.id,
      familyName: user.familyName,
      givenName: user.givenName,
      firstName: user.givenName,
      lastName: user.familyName,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      accountStatus: user.accountStatus as AccountStatus,
      restaurantId: user.restaurantId,
      store: user.restaurant,
      storeName: user.restaurant.name,
      jobRole: user.jobRole,
      role: user.jobRole,
      position: user.jobRole,
      birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : null,
      avatar: user.profilePhoto,
      avatarUrl: user.profilePhoto,
      phone: user.phone,
      address: user.address,
      userLevel: user.userLevel,
      preferredLanguage: user.preferredLanguage,
      permissions,
    };
  }
}
