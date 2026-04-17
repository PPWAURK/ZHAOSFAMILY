import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Invitation, Role } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const INVITATION_TOKEN_BYTES = 48;
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async create(
    inviterId: string,
    email: string,
    role: Role = Role.STAFF,
  ): Promise<Invitation> {
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new BadRequestException('Un compte existe déjà pour cet email');
    }
    const token = randomBytes(INVITATION_TOKEN_BYTES).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        role,
        tokenHash,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        inviterId,
      },
    });
    const url = `${this.config.getOrThrow<string>('APP_URL')}/accept-invitation?token=${token}`;
    this.logger.log(`✉️  Invitation pour ${email} (${role}): ${url}`);
    return invitation;
  }
}
