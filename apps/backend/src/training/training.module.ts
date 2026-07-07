import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TrainingController } from './training.controller';
import { TrainingQuizAdminController } from './training-quiz-admin.controller';
import { ScreenSecurityEventService } from './screenshot-event.service';
import { TrainingService } from './training.service';
import { TrainingQuizService } from './training-quiz.service';
import { TrainingQuizAdminService } from './training-quiz-admin.service';
import { TrainingQuizGeneratorService } from './training-quiz-generator.service';
import { TrainingAiConfigService } from './training-ai-config.service';
import { TrainingTitleService } from './training-title.service';
import { TrainingBadgeService } from './training-badge.service';
import { TrainingMonthlyReportService } from './training-monthly-report.service';

@Module({
  imports: [AuthModule, MediaModule, NotificationsModule, PrismaModule],
  controllers: [TrainingController, TrainingQuizAdminController],
  providers: [
    TrainingService,
    TrainingQuizService,
    TrainingQuizAdminService,
    TrainingQuizGeneratorService,
    TrainingAiConfigService,
    TrainingTitleService,
    TrainingBadgeService,
    TrainingMonthlyReportService,
    ScreenSecurityEventService,
  ],
})
export class TrainingModule {}
