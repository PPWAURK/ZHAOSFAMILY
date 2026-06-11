import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import { TrainingTitleService } from './training-title.service';
import type {
  TrainingMyRecords,
  TrainingQuizAttemptResult,
  TrainingQuizForTaking,
  TrainingQuizOption,
  TrainingQuizQuestionPublic,
  TrainingQuizQuestionResult,
  TrainingQuizQuestionType,
  TrainingRecordItem,
  TrainingTitleItem,
} from './training.types';

type QuestionRow = {
  id: number;
  type: string;
  prompt: string;
  options: unknown;
  correctKeys: unknown;
  explanation: string | null;
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

function isCorrect(selected: string[], correct: string[]): boolean {
  if (selected.length !== correct.length) return false;

  const correctSet = new Set(correct);

  return selected.every((key) => correctSet.has(key));
}

function toPublicQuestion(row: QuestionRow): TrainingQuizQuestionPublic {
  return {
    id: row.id,
    type: normalizeType(row.type),
    prompt: row.prompt,
    options: parseOptions(row.options),
  };
}

// The number of questions actually served/graded per attempt: a configured
// `questionCount` (capped at the bank size) or the whole bank when unset.
function effectiveQuestionCount(total: number, questionCount: number): number {
  if (questionCount > 0 && questionCount < total) {
    return questionCount;
  }

  return total;
}

// Fisher–Yates shuffle then slice, so each attempt draws a fresh random subset
// (and order) from the question bank — "different every time" without an LLM.
function sampleQuestions<T>(questions: T[], count: number): T[] {
  const shuffled = [...questions];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }

  return shuffled.slice(0, effectiveQuestionCount(questions.length, count));
}

@Injectable()
export class TrainingQuizService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly titleService: TrainingTitleService,
  ) {}

  async getQuizForMaterial(
    userId: number,
    materialId: number,
  ): Promise<TrainingQuizForTaking> {
    const quiz = await this.prismaService.trainingQuiz.findUnique({
      where: { materialId },
      include: {
        material: { select: { title: true } },
        questions: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      },
    });

    if (!quiz) {
      throw new NotFoundException('TRAINING_QUIZ_NOT_FOUND');
    }

    const attempts = await this.prismaService.trainingQuizAttempt.findMany({
      where: { userId, quizId: quiz.id },
      select: { score: true, passed: true },
    });
    const bestScore = attempts.reduce(
      (best, attempt) => (attempt.score > best ? attempt.score : best),
      attempts.length > 0 ? 0 : Number.NaN,
    );

    return {
      quizId: quiz.id,
      materialId: quiz.materialId,
      materialTitle: quiz.material.title,
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts,
      attemptsUsed: attempts.length,
      bestScore: Number.isNaN(bestScore) ? null : bestScore,
      passed: attempts.some((attempt) => attempt.passed),
      questions: sampleQuestions(quiz.questions, quiz.questionCount).map(
        toPublicQuestion,
      ),
    };
  }

  async submitAttempt(
    userId: number,
    materialId: number,
    dto: SubmitQuizAttemptDto,
  ): Promise<TrainingQuizAttemptResult> {
    const quiz = await this.prismaService.trainingQuiz.findUnique({
      where: { materialId },
      include: {
        questions: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        material: { select: { positionId: true } },
      },
    });

    if (!quiz) {
      throw new NotFoundException('TRAINING_QUIZ_NOT_FOUND');
    }

    const previousAttempts = await this.prismaService.trainingQuizAttempt.count(
      {
        where: { userId, quizId: quiz.id },
      },
    );
    const alreadyPassed = await this.prismaService.trainingQuizAttempt.count({
      where: { userId, quizId: quiz.id, passed: true },
    });

    if (
      quiz.maxAttempts !== null &&
      alreadyPassed === 0 &&
      previousAttempts >= quiz.maxAttempts
    ) {
      throw new ForbiddenException('TRAINING_QUIZ_NO_ATTEMPTS_LEFT');
    }

    const expectedCount = effectiveQuestionCount(
      quiz.questions.length,
      quiz.questionCount,
    );
    const { results, score, answeredCount } = this.grade(quiz.questions, dto);

    // The client must answer exactly the number of questions served, so a
    // partial submission can't inflate the score.
    if (answeredCount !== expectedCount) {
      throw new BadRequestException('TRAINING_QUIZ_INCOMPLETE_ANSWERS');
    }

    const passed = score >= quiz.passingScore;
    const answersJson: Prisma.InputJsonValue = dto.answers.map((answer) => ({
      questionId: answer.questionId,
      selectedKeys: answer.selectedKeys,
    }));

    await this.prismaService.trainingQuizAttempt.create({
      data: {
        userId,
        quizId: quiz.id,
        score,
        passed,
        answers: answersJson,
      },
    });

    let materialCompleted = false;
    let newTitles: TrainingTitleItem[] = [];

    if (passed) {
      await this.markMaterialCompleted(userId, materialId);
      materialCompleted = true;
      newTitles = await this.titleService.evaluateForPosition(
        userId,
        quiz.material.positionId,
      );
    }

    return {
      score,
      passed,
      attemptsUsed: previousAttempts + 1,
      materialCompleted,
      results,
      newTitles,
    };
  }

  async getMyRecords(userId: number): Promise<TrainingMyRecords> {
    const completedRows =
      await this.prismaService.trainingMaterialProgress.findMany({
        where: { userId, status: 'completed' },
        select: {
          materialId: true,
          completedAt: true,
          material: {
            select: {
              title: true,
              positionId: true,
              type: true,
              isRequired: true,
            },
          },
        },
        orderBy: [{ completedAt: 'desc' }],
      });
    const attempts = await this.prismaService.trainingQuizAttempt.findMany({
      where: { userId, passed: true },
      select: { score: true, quiz: { select: { materialId: true } } },
    });
    const bestScoreByMaterial = new Map<number, number>();

    for (const attempt of attempts) {
      const materialId = attempt.quiz.materialId;
      const current = bestScoreByMaterial.get(materialId) ?? 0;
      if (attempt.score > current)
        bestScoreByMaterial.set(materialId, attempt.score);
    }

    const records: TrainingRecordItem[] = completedRows.map((row) => ({
      materialId: row.materialId,
      title: row.material.title,
      positionId: row.material.positionId,
      type: row.material.type,
      isRequired: row.material.isRequired,
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
      quizScore: bestScoreByMaterial.get(row.materialId) ?? null,
    }));
    const titles = await this.titleService.listEarnedTitles(userId);

    return { records, titles, completedCount: records.length };
  }

  // Grades only the questions the client actually answered (a random subset of
  // the bank), looking each up in the bank for its correct keys.
  private grade(
    questions: QuestionRow[],
    dto: SubmitQuizAttemptDto,
  ): {
    results: TrainingQuizQuestionResult[];
    score: number;
    answeredCount: number;
  } {
    const questionById = new Map(
      questions.map((question) => [question.id, question]),
    );
    const results: TrainingQuizQuestionResult[] = [];
    let correctCount = 0;
    let answeredCount = 0;

    for (const answer of dto.answers) {
      const question = questionById.get(answer.questionId);
      if (!question) continue;

      answeredCount += 1;
      const correctKeys = parseKeys(question.correctKeys);
      const correct = isCorrect(answer.selectedKeys, correctKeys);
      if (correct) correctCount += 1;
      results.push({
        questionId: question.id,
        correct,
        correctKeys,
        explanation: question.explanation,
      });
    }

    const score =
      answeredCount === 0
        ? 0
        : Math.round((correctCount / answeredCount) * 100);

    return { results, score, answeredCount };
  }

  private async markMaterialCompleted(
    userId: number,
    materialId: number,
  ): Promise<void> {
    const now = new Date();
    await this.prismaService.trainingMaterialProgress.upsert({
      where: { userId_materialId: { userId, materialId } },
      create: {
        userId,
        materialId,
        status: 'completed',
        progressPct: 100,
        completedAt: now,
      },
      update: {
        status: 'completed',
        progressPct: 100,
        completedAt: now,
        lastOpenedAt: now,
      },
    });
  }
}
