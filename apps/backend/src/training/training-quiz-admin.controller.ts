import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PermissionGuard } from '../auth/guards/permission.guard';
import {
  RequirePermissions,
  TRAINING_MATERIAL_PERMISSIONS,
} from '../auth/permissions';
import {
  CreateTrainingQuizQuestionDto,
  UpdateTrainingQuizQuestionDto,
} from './dto/training-quiz-question.dto';
import { UpsertTrainingQuizDto } from './dto/upsert-training-quiz.dto';
import { TrainingQuizAdminService } from './training-quiz-admin.service';
import type {
  TrainingQuizAdminView,
  TrainingQuizDraftQuestion,
} from './training.types';

@Controller('training')
@UseGuards(PermissionGuard)
@RequirePermissions(TRAINING_MATERIAL_PERMISSIONS.update)
export class TrainingQuizAdminController {
  constructor(private readonly quizAdminService: TrainingQuizAdminService) {}

  @Get('materials/:id/quiz/manage')
  getQuiz(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TrainingQuizAdminView | null> {
    return this.quizAdminService.getQuizAdminView(id);
  }

  @Put('materials/:id/quiz')
  upsertQuiz(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertTrainingQuizDto,
  ): Promise<TrainingQuizAdminView> {
    return this.quizAdminService.upsertQuiz(id, dto);
  }

  @Delete('materials/:id/quiz')
  deleteQuiz(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.quizAdminService.deleteQuiz(id);
  }

  @Post('materials/:id/quiz/questions')
  addQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTrainingQuizQuestionDto,
  ): Promise<TrainingQuizAdminView> {
    return this.quizAdminService.addQuestion(id, dto);
  }

  @Post('materials/:id/quiz/generate')
  generateDraft(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TrainingQuizDraftQuestion[]> {
    return this.quizAdminService.generateDraftQuestions(id);
  }

  @Patch('quiz-questions/:questionId')
  updateQuestion(
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: UpdateTrainingQuizQuestionDto,
  ): Promise<TrainingQuizAdminView> {
    return this.quizAdminService.updateQuestion(questionId, dto);
  }

  @Delete('quiz-questions/:questionId')
  deleteQuestion(
    @Param('questionId', ParseIntPipe) questionId: number,
  ): Promise<TrainingQuizAdminView> {
    return this.quizAdminService.deleteQuestion(questionId);
  }
}
