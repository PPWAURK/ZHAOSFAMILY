import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { promisify } from 'node:util';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateCurrentUserDto } from './dto/update-current-user.dto';

const scrypt = promisify(scryptCallback);
const SUPPORTED_PROFILE_PHOTO_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;
const DEFAULT_USER_LEVEL = 0;
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 8;

export type RegisterResponse = {
  message: 'REGISTRATION_SAVED';
  userId: number;
};

export type AuthUser = {
  id: number;
  familyName: string;
  givenName: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  emailVerified: boolean;
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

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

type AccessTokenPayload = {
  sub: number;
  exp: number;
};

function buildFullName(familyName: string, givenName: string): string {
  return [familyName, givenName].filter(Boolean).join(' ').trim();
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

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly restaurantsService: RestaurantsService,
    private readonly configService: ConfigService,
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

    const passwordHash = await hashPassword(registerDto.password);
    const createdUser = await this.prismaService.user.create({
      data: {
        familyName,
        givenName,
        name: buildFullName(familyName, givenName),
        email: normalizedEmail,
        emailVerified: false,
        passwordHash,
        restaurantId: registerDto.restaurantId,
        birthday: registerDto.birthday
          ? new Date(`${registerDto.birthday}T00:00:00.000Z`)
          : null,
        jobRole: registerDto.jobRole ?? null,
        profilePhoto: registerDto.profilePhotoDataUrl ?? null,
        userLevel: registerDto.level ?? DEFAULT_USER_LEVEL,
        acceptedTerms: registerDto.acceptedTerms,
        preferredLanguage: registerDto.language,
      },
      select: {
        id: true,
      },
    });

    return {
      message: 'REGISTRATION_SAVED',
      userId: createdUser.id,
    };
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
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

    return {
      accessToken: this.signAccessToken({ sub: user.id }),
      user: this.toAuthUser(user, await this.listUserPermissions(user.id)),
    };
  }

  async getCurrentUser(accessToken: string | undefined): Promise<AuthUser> {
    const payload = this.verifyAccessToken(accessToken);
    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
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

    return this.toAuthUser(user, await this.listUserPermissions(user.id));
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

  async getPermissionsForToken(
    accessToken: string | undefined,
  ): Promise<string[]> {
    const payload = this.verifyAccessToken(accessToken);

    return this.listUserPermissions(payload.sub);
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

    const payload = JSON.parse(
      base64UrlDecode(encodedPayload),
    ) as AccessTokenPayload;

    if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('INVALID_ACCESS_TOKEN');
    }

    return payload;
  }

  private getAccessTokenSecret(): string {
    return (
      this.configService.get<string>('AUTH_ACCESS_TOKEN_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'zhao-local-dev-access-token-secret'
    );
  }

  private async listUserPermissions(userId: number): Promise<string[]> {
    const userRoles = await this.prismaService.userRole.findMany({
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
    });

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

  private toAuthUser(
    user: {
      id: number;
      familyName: string;
      givenName: string;
      name: string;
      email: string;
      emailVerified: boolean;
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
    },
    permissions: string[],
  ): AuthUser {
    return {
      id: user.id,
      familyName: user.familyName,
      givenName: user.givenName,
      firstName: user.givenName,
      lastName: user.familyName,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
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
