import type { AttemptAnswer, SnapshotQuestion } from './exam-grading';

export type LayoutSection = {
  titleZh: string;
  titleFr: string;
  timeLimitMinutes: number | null;
  questionCount: number;
};

export type LayoutRule = {
  categoryId: number;
  labelZh: string;
  labelFr: string;
  maxWrong: number;
};

/** Frozen at start so later template edits never change a running paper. */
export type AttemptLayout = {
  sections: LayoutSection[];
  breakMinutes: number;
  rules: LayoutRule[];
  /** Session end: no section deadline or break may run past it. */
  endsAt: string | null;
};

export type SectionTiming = {
  sectionIndex: number;
  breakEndsAt: Date | null;
  deadlineAt: Date | null;
};

const MINUTE_MS = 60_000;

export function readLayout(value: unknown): AttemptLayout | null {
  if (!value || typeof value !== 'object') return null;
  const layout = value as AttemptLayout;
  return Array.isArray(layout.sections) ? layout : null;
}

const minDate = (a: Date, b: Date | null): Date => (b && b < a ? b : a);

/** Personal limit from the start time, capped by the session end. */
export function computeDeadline(
  start: Date,
  timeLimitMinutes: number | null,
  endsAt: Date | null,
): Date | null {
  const personal = timeLimitMinutes
    ? new Date(start.getTime() + timeLimitMinutes * MINUTE_MS)
    : null;
  return personal ? minDate(personal, endsAt) : endsAt;
}

export const isLastSection = (layout: AttemptLayout, index: number) =>
  index >= layout.sections.length - 1;

/**
 * Timing of the next section once section `index` ends at `endedAt`: the
 * break starts then, and the next section's clock starts when it is over.
 */
export function nextSectionTiming(
  layout: AttemptLayout,
  index: number,
  endedAt: Date,
): SectionTiming {
  const endsAt = layout.endsAt ? new Date(layout.endsAt) : null;
  const breakEndsAt = minDate(
    new Date(endedAt.getTime() + layout.breakMinutes * MINUTE_MS),
    endsAt,
  );
  const next = index + 1;
  return {
    sectionIndex: next,
    breakEndsAt: breakEndsAt > endedAt ? breakEndsAt : null,
    deadlineAt: computeDeadline(
      breakEndsAt,
      layout.sections[next].timeLimitMinutes,
      endsAt,
    ),
  };
}

/** Ends the break now: the section clock starts immediately. */
export function startNowTiming(
  layout: AttemptLayout,
  index: number,
  now: Date,
): SectionTiming {
  const endsAt = layout.endsAt ? new Date(layout.endsAt) : null;
  return {
    sectionIndex: index,
    breakEndsAt: null,
    deadlineAt: computeDeadline(
      now,
      layout.sections[index].timeLimitMinutes,
      endsAt,
    ),
  };
}

export function isOnBreak(
  attempt: { breakEndsAt: Date | null },
  now: Date = new Date(),
): boolean {
  return attempt.breakEndsAt !== null && now < attempt.breakEndsAt;
}

export const sectionOf = (question: SnapshotQuestion): number =>
  question.section ?? 0;

/**
 * Answers to store: the current section's come from the client, every other
 * section keeps what is already stored. During a break nothing changes.
 */
export function mergeSectionAnswers(
  snapshot: readonly SnapshotQuestion[],
  stored: readonly AttemptAnswer[],
  incoming: readonly AttemptAnswer[],
  currentSection: number,
  onBreak: boolean,
): AttemptAnswer[] {
  if (onBreak) return [...stored];
  const sections = new Map(snapshot.map((q) => [q.id, sectionOf(q)]));
  const inCurrent = (a: AttemptAnswer) =>
    sections.get(a.questionId) === currentSection;
  return [
    ...stored.filter((a) => !inCurrent(a)),
    ...incoming.filter(inCurrent),
  ];
}
