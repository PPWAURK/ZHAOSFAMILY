import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma, type ExamQuestion, type ExamTemplate } from '@prisma/client';
import type { AuthUser } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { drawBlueprint } from '../blueprint/blueprint-draw';
import {
  readBlueprint,
  sectionQuestionCount,
  type ExamBlueprint,
} from '../blueprint/exam-blueprint';
import { ExamBlueprintService } from '../blueprint/exam-blueprint.service';
import { QUESTION_TYPES } from '../exam-bank.constants';
import type { QuestionOption } from '../exam-bank.types';
import { poolWhere, templateFilters } from '../templates/template-pool';
import { ExamAttemptProgressService } from './exam-attempt-progress.service';
import {
  toAttemptView,
  type AttemptWithTemplate,
  type ExamAttemptView,
} from './exam-attempt.view';
import { arrangeOptions, sample } from './exam-draw';
import type { SnapshotQuestion } from './exam-grading';
import { computeDeadline, type AttemptLayout } from './exam-sections';

export { computeDeadline } from './exam-sections';
export { isOverdue } from './exam-attempt-progress.service';

const COUNT_FIELD = {
  single: 'singleCount',
  multiple: 'multipleCount',
  boolean: 'booleanCount',
} as const;

export type StartPlan = {
  /** Unique while the attempt is in progress; prevents two concurrent attempts. */
  activeKey: string;
  sessionId: number | null;
  /** Hard stop (session end); the personal time limit never runs past it. */
  endsAt: Date | null;
  /** Self-service exams honour template.maxAttempts; sessions allow one each. */
  enforceMaxAttempts: boolean;
};

type DrawnPaper = {
  snapshot: SnapshotQuestion[];
  layout: AttemptLayout | null;
  firstLimitMinutes: number | null;
};

/** Resumes or draws an attempt; shared by self-service exams and sessions. */
@Injectable()
export class ExamAttemptStarterService {
  private readonly logger = new Logger(ExamAttemptStarterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ExamAttemptProgressService,
    private readonly blueprints: ExamBlueprintService,
  ) {}

  async open(
    user: AuthUser,
    template: ExamTemplate,
    plan: StartPlan,
  ): Promise<ExamAttemptView> {
    const current = await this.findByActiveKey(plan.activeKey);
    if (current) {
      const settled = await this.progress.settle(current);
      if (settled.status === 'IN_PROGRESS') return toAttemptView(settled);
    }

    if (plan.enforceMaxAttempts)
      await this.assertAttemptsLeft(user.id, template);
    const paper = await this.drawPaper(template, plan.endsAt);
    const now = new Date();
    try {
      const created = await this.prisma.examAttempt.create({
        data: {
          templateId: template.id,
          sessionId: plan.sessionId,
          userId: user.id,
          restaurantId: user.restaurantId,
          activeKey: plan.activeKey,
          questionIds: paper.snapshot.map((q) => q.id),
          snapshot: paper.snapshot,
          layout: paper.layout ?? Prisma.DbNull,
          answers: [],
          totalCount: paper.snapshot.length,
          startedAt: now,
          deadlineAt: computeDeadline(
            now,
            paper.firstLimitMinutes,
            plan.endsAt,
          ),
        },
        include: { template: true },
      });
      return toAttemptView(created);
    } catch (error) {
      const isRace =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002';
      const winner = isRace ? await this.findByActiveKey(plan.activeKey) : null;
      if (winner) return toAttemptView(winner);
      if (isRace) throw new ConflictException('EXAM_SESSION_ALREADY_TAKEN');
      throw error;
    }
  }

  private async assertAttemptsLeft(
    userId: number,
    template: ExamTemplate,
  ): Promise<void> {
    if (!template.maxAttempts) return;
    const used = await this.prisma.examAttempt.count({
      where: {
        userId,
        templateId: template.id,
        sessionId: null,
        status: { in: ['SUBMITTED', 'EXPIRED'] },
      },
    });
    if (used >= template.maxAttempts)
      throw new ConflictException('EXAM_NO_ATTEMPTS_LEFT');
  }

  private async drawPaper(
    template: ExamTemplate,
    endsAt: Date | null,
  ): Promise<DrawnPaper> {
    const blueprint = readBlueprint(template.blueprint);
    if (blueprint) return this.drawSectioned(template, blueprint, endsAt);
    const ids = await this.drawSimpleIds(template);
    return {
      snapshot: await this.buildSnapshot(template, [ids]),
      layout: null,
      firstLimitMinutes: template.timeLimitMinutes,
    };
  }

  private async drawSectioned(
    template: ExamTemplate,
    blueprint: ExamBlueprint,
    endsAt: Date | null,
  ): Promise<DrawnPaper> {
    const [candidates, rules] = await Promise.all([
      this.blueprints.loadCandidates(blueprint),
      this.blueprints.ruleLabels(blueprint),
    ]);
    const draw = drawBlueprint(blueprint, candidates);
    if (!draw) throw new ConflictException('EXAM_POOL_INSUFFICIENT');
    if (draw.isKnowledgePointRelaxed) {
      this.logger.warn(
        `Template #${template.id}: knowledge points could not all be unique; drew with repeats.`,
      );
    }
    return {
      snapshot: await this.buildSnapshot(template, draw.sections),
      layout: {
        sections: blueprint.sections.map((s) => ({
          titleZh: s.titleZh,
          titleFr: s.titleFr,
          timeLimitMinutes: s.timeLimitMinutes,
          questionCount: sectionQuestionCount(s),
        })),
        breakMinutes: blueprint.breakMinutes,
        rules,
        endsAt: endsAt?.toISOString() ?? null,
      },
      firstLimitMinutes: blueprint.sections[0].timeLimitMinutes,
    };
  }

  private async drawSimpleIds(template: ExamTemplate): Promise<number[]> {
    const filters = templateFilters(template);
    const chosenIds: number[] = [];
    for (const type of QUESTION_TYPES) {
      const count = template[COUNT_FIELD[type]];
      if (!count) continue;
      const pool = await this.prisma.examQuestion.findMany({
        where: poolWhere(filters, type),
        select: { id: true },
      });
      if (pool.length < count)
        throw new ConflictException('EXAM_POOL_INSUFFICIENT');
      chosenIds.push(
        ...sample(
          pool.map((q) => q.id),
          count,
        ),
      );
    }
    return chosenIds;
  }

  /** Freezes the drawn questions; sections keep their order. */
  private async buildSnapshot(
    template: ExamTemplate,
    sections: number[][],
  ): Promise<SnapshotQuestion[]> {
    const rows = await this.prisma.examQuestion.findMany({
      where: { id: { in: sections.flat() } },
      include: { sourceMaterial: { select: { categoryId: true } } },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const isSectioned =
      sections.length > 1 || !!readBlueprint(template.blueprint);
    return sections.flatMap((ids, section) =>
      ids.map((id) =>
        toSnapshotQuestion(
          byId.get(id)!,
          template,
          isSectioned ? section : null,
        ),
      ),
    );
  }

  private findByActiveKey(
    activeKey: string,
  ): Promise<AttemptWithTemplate | null> {
    return this.prisma.examAttempt.findUnique({
      where: { activeKey },
      include: { template: true },
    });
  }
}

function toSnapshotQuestion(
  q: ExamQuestion & { sourceMaterial: { categoryId: number | null } | null },
  template: ExamTemplate,
  section: number | null,
): SnapshotQuestion {
  return {
    id: q.id,
    type: q.type,
    promptZh: q.promptZh,
    promptFr: q.promptFr,
    options: arrangeOptions(
      q.type,
      q.options as QuestionOption[],
      template.shuffleOptions,
    ),
    correctKeys: q.correctKeys as string[],
    explanationZh: q.explanationZh,
    explanationFr: q.explanationFr,
    ...(section === null
      ? {}
      : {
          section,
          // The file's category wins so a veto rule follows the blueprint.
          categoryId: q.sourceMaterial?.categoryId ?? q.categoryId,
        }),
  };
}
