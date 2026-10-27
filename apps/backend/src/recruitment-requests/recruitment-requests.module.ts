import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PublicRecruitmentOpeningsController } from './public-recruitment-openings.controller';
import { RecruitmentRequestsController } from './recruitment-requests.controller';
import { RecruitmentRequestsService } from './recruitment-requests.service';

@Module({
  imports: [AuthModule, NotificationsModule, PrismaModule],
  controllers: [
    RecruitmentRequestsController,
    PublicRecruitmentOpeningsController,
  ],
  providers: [RecruitmentRequestsService],
})
export class RecruitmentRequestsModule {}
