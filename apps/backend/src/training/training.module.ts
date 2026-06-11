import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TrainingController } from './training.controller';
import { TrainingQuizAdminController } from './training-quiz-admin.controller';
import { TrainingService } from './training.service';
import { TrainingQuizService } from './training-quiz.service';
import { TrainingQuizAdminService } from './training-quiz-admin.service';
import { TrainingTitleService } from './training-title.service';

@Module({
  imports: [AuthModule, MediaModule, PrismaModule],
  controllers: [TrainingController, TrainingQuizAdminController],
  providers: [
    TrainingService,
    TrainingQuizService,
    TrainingQuizAdminService,
    TrainingTitleService,
  ],
})
export class TrainingModule {}
