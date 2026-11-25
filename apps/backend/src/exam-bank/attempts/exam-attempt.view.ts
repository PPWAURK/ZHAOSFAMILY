import type { ExamAttempt, ExamTemplate } from '@prisma/client';
import type { QuestionOption } from '../exam-bank.types';
import type {
  AttemptAnswer,
  QuestionResult,
  RuleResult,
  SnapshotQuestion,
} from './exam-grading';
import { isOnBreak, readLayout, sectionOf } from './exam-sections';

export type AttemptQuestionView = {
  id: number;
  type: string;
  promptZh: string;
  promptFr: string;
  options: QuestionOption[];
};

export type AttemptResultItemView = AttemptQuestionView & {
  selectedKeys: string[];
  correctKeys: string[];
  isCorrect: boolean;
  explanationZh: string | null;
  explanationFr: string | null;
};

export type AttemptSectionView = {
  titleZh: string;
  titleFr: string;
  timeLimitMinutes: number | null;
  questionCount: number;
};

export type SectionScoreView = {
  titleZh: string;
  titleFr: string;
  correctCount: number;
  totalCount: number;
};

export type ExamAttemptView = {
  id: number;
  templateId: number;
  titleZh: string;
  titleFr: string;
  status: string;
  passingScore: number;
  totalCount: number;
  startedAt: string;
  deadlineAt: string | null;
  submittedAt: string | null;
  serverNow: string;
  answers: AttemptAnswer[];
  /** Sectioned papers: every section; null for a single-section paper. */
  sections: AttemptSectionView[] | null;
  sectionIndex: number;
  /** Set while the employee is on the break before `sectionIndex`. */
  breakEndsAt: string | null;
  /**
   * Present while IN_PROGRESS: the current section's questions without any
   * answer key (empty during a break).
   */
  questions: AttemptQuestionView[] | null;
  /** Present once graded. */
  result: {
    score: number;
    passed: boolean;
    correctCount: number;
    showExplanations: boolean;
    sections: SectionScoreView[] | null;
    /** Veto rules; a failed one fails the paper whatever the score. */
    rules: RuleResult[];
    items: AttemptResultItemView[];
  } | null;
};

export type AttemptWithTemplate = ExamAttempt & { template: ExamTemplate };

const stripAnswer = (q: SnapshotQuestion): AttemptQuestionView => ({
  id: q.id,
  type: q.type,
  promptZh: q.promptZh,
  promptFr: q.promptFr,
  options: q.options,
});

/**
 * Admins (`forceDetails`) always see answer keys; employees see them only
 * when the template enables explanations.
 */
export function toAttemptView(
  attempt: AttemptWithTemplate,
  forceDetails = false,
): ExamAttemptView {
  const snapshot = attempt.snapshot as SnapshotQuestion[];
  const answers = (attempt.answers as AttemptAnswer[] | null) ?? [];
  const isGraded = attempt.status !== 'IN_PROGRESS' && attempt.score !== null;
  const showDetails = forceDetails || attempt.template.showExplanations;
  const results = new Map(
    ((attempt.results as QuestionResult[] | null) ?? []).map((r) => [
      r.questionId,
      r.isCorrect,
    ]),
  );
  const selected = new Map(answers.map((a) => [a.questionId, a.selectedKeys]));
  const layout = readLayout(attempt.layout);
  const onBreak = isOnBreak(attempt);
  const current = layout
    ? snapshot.filter((q) => sectionOf(q) === attempt.sectionIndex)
    : snapshot;

  return {
    id: attempt.id,
    templateId: attempt.templateId,
    titleZh: attempt.template.titleZh,
    titleFr: attempt.template.titleFr,
    status: attempt.status,
    passingScore: attempt.template.passingScore,
    totalCount: attempt.totalCount,
    startedAt: attempt.startedAt.toISOString(),
    deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    serverNow: new Date().toISOString(),
    answers,
    sections: layout?.sections ?? null,
    sectionIndex: attempt.sectionIndex,
    breakEndsAt:
      !isGraded && onBreak ? attempt.breakEndsAt!.toISOString() : null,
    questions: isGraded ? null : onBreak ? [] : current.map(stripAnswer),
    result: isGraded
      ? {
          score: attempt.score!,
          passed: attempt.passed ?? false,
          correctCount: attempt.correctCount ?? 0,
          showExplanations: showDetails,
          sections: layout
            ? layout.sections.map((section, index) => {
                const own = snapshot.filter((q) => sectionOf(q) === index);
                return {
                  titleZh: section.titleZh,
                  titleFr: section.titleFr,
                  correctCount: own.filter((q) => results.get(q.id)).length,
                  totalCount: own.length,
                };
              })
            : null,
          rules: (attempt.ruleResults as RuleResult[] | null) ?? [],
          items: snapshot.map((q) => ({
            ...stripAnswer(q),
            selectedKeys: selected.get(q.id) ?? [],
            correctKeys: showDetails ? q.correctKeys : [],
            isCorrect: results.get(q.id) ?? false,
            explanationZh: showDetails ? q.explanationZh : null,
            explanationFr: showDetails ? q.explanationFr : null,
          })),
        }
      : null,
  };
}
