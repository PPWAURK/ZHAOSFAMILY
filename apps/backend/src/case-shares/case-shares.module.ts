import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CaseSharesController } from './case-shares.controller';
import { CaseSharesService } from './case-shares.service';

@Module({
  imports: [AuthModule, MediaModule, NotificationsModule, PrismaModule],
  controllers: [CaseSharesController],
  providers: [CaseSharesService],
})
export class CaseSharesModule {}
