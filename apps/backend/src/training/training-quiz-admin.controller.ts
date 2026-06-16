import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PermissionGuard } from '../auth/guards/permission.guard';
import {
  RequirePermissions,
  TRAINING_MATERIAL_PERMISSIONS,
} from '../auth/permissions';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import {
  CreateTrainingQuizQuestionDto,
  UpdateTrainingQuizQuestionDto,
} from './dto/training-quiz-question.dto';
import { UpsertTrainingQuizDto } from './dto/upsert-training-quiz.dto';
import { TrainingAiConfigService } from './training-ai-config.service';
import { TrainingQuizAdminService } from './training-quiz-admin.service';
import type {
  AiQuizConfigView,
  TrainingQuizAdminView,
  TrainingQuizDraftQuestion,
} from './training.types';

@Controller('training')
@UseGuards(PermissionGuard)
@RequirePermissions(TRAINING_MATERIAL_PERMISSIONS.update)
export class TrainingQuizAdminController {
  constructor(
    private readonly quizAdminService: TrainingQuizAdminService,
    private readonly aiConfigService: TrainingAiConfigService,
  ) {}

  @Get('ai-config')
  getAiConfig(): Promise<AiQuizConfigView> {
    return this.aiConfigService.getConfigView();
  }

  @Put('ai-config')
  updateAiConfig(@Body() dto: UpdateAiConfigDto): Promise<AiQuizConfigView> {
    return this.aiConfigService.updateConfig(dto);
  }

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

  @Sse('materials/:id/quiz/generate/sse')
  generateDraftSSE(
    @Param('id', ParseIntPipe) id: number,
  ): Observable<MessageEvent> {
    return this.quizAdminService.generateDraftQuestionsStream(id);
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
