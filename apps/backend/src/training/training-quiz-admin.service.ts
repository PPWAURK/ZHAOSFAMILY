import {
  BadRequestException,
  Injectable,
  MessageEvent,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { OnGenerationProgress } from './training-quiz-generator.service';
import { TrainingQuizGeneratorService } from './training-quiz-generator.service';
import type {
  CreateTrainingQuizQuestionDto,
  UpdateTrainingQuizQuestionDto,
} from './dto/training-quiz-question.dto';
import type { UpsertTrainingQuizDto } from './dto/upsert-training-quiz.dto';
import { parseTranslations, toTranslationsInput } from './training-quiz-i18n';
import type {
  TrainingQuizAdminView,
  TrainingQuizDraftQuestion,
  TrainingQuizOption,
  TrainingQuizQuestionAdmin,
  TrainingQuizQuestionType,
} from './training.types';

const DEFAULT_PASSING_SCORE = 80;
const DEFAULT_AI_DRAFT_QUESTION_COUNT = 6;

type QuestionRow = {
  id: number;
  type: string;
  prompt: string;
  options: unknown;
  correctKeys: unknown;
  explanation: string | null;
  translations: unknown;
  sortOrder: number;
};

function parseOptions(value: unknown): TrainingQuizOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is { key: string; label: string } =>
      Boolean(item && typeof item === 'object'),
    )
    .map((item) => ({ key: String(item.key), label: String(item.label) }));
}

function parseKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item));
}

function normalizeType(type: string): TrainingQuizQuestionType {
  if (type === 'multiple' || type === 'boolean') return type;

  return 'single';
}

function toOptionsJson(options: TrainingQuizOption[]): Prisma.InputJsonValue {
  return options.map((option) => ({ key: option.key, label: option.label }));
}

function toAdminQuestion(row: QuestionRow): TrainingQuizQuestionAdmin {
  return {
    id: row.id,
    type: normalizeType(row.type),
    prompt: row.prompt,
    options: parseOptions(row.options),
    correctKeys: parseKeys(row.correctKeys),
    explanation: row.explanation,
    sortOrder: row.sortOrder,
    translations: parseTranslations(row.translations),
  };
}

// Correct keys must reference real options; single/boolean accept exactly one.
function validateAnswerShape(
  type: TrainingQuizQuestionType,
  options: TrainingQuizOption[],
  correctKeys: string[],
): void {
  const optionKeys = new Set(options.map((option) => option.key));

  if (new Set(optionKeys).size !== options.length) {
    throw new BadRequestException('DUPLICATE_QUIZ_OPTION_KEYS');
  }

  if (correctKeys.some((key) => !optionKeys.has(key))) {
    throw new BadRequestException('QUIZ_CORRECT_KEY_NOT_IN_OPTIONS');
  }

  if (type !== 'multiple' && correctKeys.length !== 1) {
    throw new BadRequestException('QUIZ_SINGLE_ANSWER_REQUIRED');
  }
}

@Injectable()
export class TrainingQuizAdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly generatorService: TrainingQuizGeneratorService,
  ) {}

  async getQuizAdminView(
    materialId: number,
  ): Promise<TrainingQuizAdminView | null> {
    await this.ensureMaterialExists(materialId);

    return this.buildAdminView(materialId);
  }

  async upsertQuiz(
    materialId: number,
    dto: UpsertTrainingQuizDto,
  ): Promise<TrainingQuizAdminView> {
    await this.ensureMaterialExists(materialId);

    const data = {
      passingScore: dto.passingScore,
      questionCount: dto.questionCount,
      maxAttempts: dto.maxAttempts ?? null,
    };
    await this.prismaService.trainingQuiz.upsert({
      where: { materialId },
      create: { materialId, ...data },
      update: data,
    });

    return this.requireAdminView(materialId);
  }

  async deleteQuiz(materialId: number): Promise<{ message: string }> {
    const quiz = await this.prismaService.trainingQuiz.findUnique({
      where: { materialId },
      select: { id: true },
    });

    if (!quiz) {
      throw new NotFoundException('TRAINING_QUIZ_NOT_FOUND');
    }

    await this.prismaService.trainingQuiz.delete({ where: { materialId } });

    return { message: 'TRAINING_QUIZ_DELETED' };
  }

  async addQuestion(
    materialId: number,
    dto: CreateTrainingQuizQuestionDto,
  ): Promise<TrainingQuizAdminView> {
    validateAnswerShape(dto.type, dto.options, dto.correctKeys);
    const quiz = await this.ensureQuiz(materialId);
    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder(quiz.id));

    await this.prismaService.trainingQuizQuestion.create({
      data: {
        quizId: quiz.id,
        type: dto.type,
        prompt: dto.prompt,
        options: toOptionsJson(dto.options),
        correctKeys: dto.correctKeys,
        explanation: dto.explanation ?? null,
        translations: toTranslationsInput(dto.translations),
        sortOrder,
      },
    });

    return this.requireAdminView(materialId);
  }

  async updateQuestion(
    questionId: number,
    dto: UpdateTrainingQuizQuestionDto,
  ): Promise<TrainingQuizAdminView> {
    const existing = await this.prismaService.trainingQuizQuestion.findUnique({
      where: { id: questionId },
      include: { quiz: { select: { materialId: true } } },
    });

    if (!existing) {
      throw new NotFoundException('TRAINING_QUIZ_QUESTION_NOT_FOUND');
    }

    const type = dto.type ?? normalizeType(existing.type);
    const options = dto.options ?? parseOptions(existing.options);
    const correctKeys = dto.correctKeys ?? parseKeys(existing.correctKeys);
    validateAnswerShape(type, options, correctKeys);

    await this.prismaService.trainingQuizQuestion.update({
      where: { id: questionId },
      data: {
        type,
        prompt: dto.prompt ?? existing.prompt,
        options: toOptionsJson(options),
        correctKeys,
        explanation:
          dto.explanation === undefined
            ? existing.explanation
            : dto.explanation,
        ...(dto.translations === undefined
          ? {}
          : { translations: toTranslationsInput(dto.translations) }),
        sortOrder: dto.sortOrder ?? existing.sortOrder,
      },
    });

    return this.requireAdminView(existing.quiz.materialId);
  }

  async deleteQuestion(questionId: number): Promise<TrainingQuizAdminView> {
    const existing = await this.prismaService.trainingQuizQuestion.findUnique({
      where: { id: questionId },
      include: { quiz: { select: { materialId: true } } },
    });

    if (!existing) {
      throw new NotFoundException('TRAINING_QUIZ_QUESTION_NOT_FOUND');
    }

    await this.prismaService.trainingQuizQuestion.delete({
      where: { id: questionId },
    });

    return this.requireAdminView(existing.quiz.materialId);
  }

  // AI draft generation — reads the material's PDF text and asks the model
  // (OpenRouter/DeepSeek via the OpenAI-compatible API) for review-ready drafts.
  async generateDraftQuestions(
    materialId: number,
    count = DEFAULT_AI_DRAFT_QUESTION_COUNT,
    onProgress?: OnGenerationProgress,
  ): Promise<TrainingQuizDraftQuestion[]> {
    if (!(await this.generatorService.isConfigured())) {
      throw new ServiceUnavailableException('TRAINING_QUIZ_AI_NOT_CONFIGURED');
    }

    const material = await this.prismaService.trainingMaterial.findUnique({
      where: { id: materialId },
      select: {
        objectKey: true,
        mimeType: true,
        title: true,
        description: true,
      },
    });

    if (!material) {
      throw new NotFoundException('TRAINING_MATERIAL_NOT_FOUND');
    }

    return this.generatorService.generate(material, count, onProgress);
  }

  /** SSE variant — returns an Observable that emits progress events then the complete result. */
  generateDraftQuestionsStream(
    materialId: number,
    count = DEFAULT_AI_DRAFT_QUESTION_COUNT,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      this.generateDraftQuestions(materialId, count, (progress) => {
        subscriber.next({
          type: 'progress',
          data: progress,
        });
      })
        .then((drafts) => {
          subscriber.next({
            type: 'complete',
            data: drafts,
          });
          subscriber.complete();
        })
        .catch((error: unknown) => {
          // Emit a readable error event (the browser can't read a closed SSE
          // stream's error), then complete so the client surfaces the reason.
          const code =
            error instanceof Error && error.message
              ? error.message
              : 'TRAINING_QUIZ_AI_REQUEST_FAILED';
          subscriber.next({ type: 'error', data: { code } });
          subscriber.complete();
        });
    });
  }

  private async ensureMaterialExists(materialId: number): Promise<void> {
    const material = await this.prismaService.trainingMaterial.findUnique({
      where: { id: materialId },
      select: { id: true },
    });

    if (!material) {
      throw new NotFoundException('TRAINING_MATERIAL_NOT_FOUND');
    }
  }

  private async ensureQuiz(materialId: number): Promise<{ id: number }> {
    const existing = await this.prismaService.trainingQuiz.findUnique({
      where: { materialId },
      select: { id: true },
    });

    if (existing) return existing;

    await this.ensureMaterialExists(materialId);

    return this.prismaService.trainingQuiz.create({
      data: { materialId, passingScore: DEFAULT_PASSING_SCORE },
      select: { id: true },
    });
  }

  private async nextSortOrder(quizId: number): Promise<number> {
    const last = await this.prismaService.trainingQuizQuestion.findFirst({
      where: { quizId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return (last?.sortOrder ?? -1) + 1;
  }

  private async buildAdminView(
    materialId: number,
  ): Promise<TrainingQuizAdminView | null> {
    const quiz = await this.prismaService.trainingQuiz.findUnique({
      where: { materialId },
      include: {
        material: { select: { title: true } },
        questions: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      },
    });

    if (!quiz) return null;

    return {
      quizId: quiz.id,
      materialId: quiz.materialId,
      materialTitle: quiz.material.title,
      passingScore: quiz.passingScore,
      questionCount: quiz.questionCount,
      maxAttempts: quiz.maxAttempts,
      questions: quiz.questions.map(toAdminQuestion),
    };
  }

  private async requireAdminView(
    materialId: number,
  ): Promise<TrainingQuizAdminView> {
    const view = await this.buildAdminView(materialId);

    if (!view) {
      throw new NotFoundException('TRAINING_QUIZ_NOT_FOUND');
    }

    return view;
  }
}
