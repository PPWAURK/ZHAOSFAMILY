import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const REFRESH_TOKEN_BYTES = 64;
const RESET_TOKEN_BYTES = 48;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.users.findByEmail(email);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(user: User): Promise<AuthTokens> {
    return this.issueTokens(user);
  }

  async refresh(userId: string, presentedToken: string): Promise<AuthTokens> {
    const user = await this.users.findById(userId);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token invalid');
    }
    const ok = await bcrypt.compare(presentedToken, user.refreshTokenHash);
    if (!ok) throw new UnauthorizedException('Refresh token invalid');
    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.users.setRefreshTokenHash(userId, null);
  }

  async acceptInvitation(
    token: string,
    name: string,
    password: string,
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const tokenHash = this.sha256(token);
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
    });
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invitation invalide ou expirée');
    }
    const existing = await this.users.findByEmail(invitation.email);
    if (existing) {
      throw new BadRequestException('Un compte existe déjà pour cet email');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.users.create({
      email: invitation.email,
      passwordHash,
      name,
      role: invitation.role,
    });
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    // Réponse identique que l'email existe ou non (anti-enumeration).
    if (!user) {
      this.logger.log(`Forgot password demandé pour ${email} — aucun compte`);
      return;
    }
    const token = randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const tokenHash = this.sha256(token);
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });
    const url = `${this.config.getOrThrow<string>('APP_URL')}/reset-password?token=${token}`;
    this.logger.log(`🔐 Reset password link pour ${email}: ${url}`);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const tokenHash = this.sha256(token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (
      !record ||
      record.usedAt ||
      record.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Token invalide ou expiré');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, refreshTokenHash: null },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.getOrThrow<string>(
        'JWT_ACCESS_EXPIRES_IN',
      ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
    const rawToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const refreshTokenHash = await bcrypt.hash(rawToken, 10);
    await this.users.setRefreshTokenHash(user.id, refreshTokenHash);
    return { accessToken, refreshToken: `${user.id}:${rawToken}` };
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
