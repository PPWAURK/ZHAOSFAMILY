import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AbcScoresController } from './abc-scores.controller';
import { AbcScoresService } from './abc-scores.service';

@Module({
  imports: [AuthModule, PrismaModule, MediaModule, NotificationsModule],
  controllers: [AbcScoresController],
  providers: [AbcScoresService],
})
export class AbcScoresModule {}
