import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardNewsController } from './dashboard-news.controller';
import { DashboardNewsService } from './dashboard-news.service';

@Module({
  imports: [AuthModule, MediaModule, NotificationsModule, PrismaModule],
  controllers: [DashboardNewsController],
  providers: [DashboardNewsService],
})
export class DashboardNewsModule {}
