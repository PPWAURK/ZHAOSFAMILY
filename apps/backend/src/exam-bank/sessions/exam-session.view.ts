import type { ExamSession, ExamTemplate } from '@prisma/client';
import { readBlueprint } from '../blueprint/exam-blueprint';

export type ExamSessionView = {
  id: number;
  code: string;
  label: string | null;
  status: string;
  requireRegistration: boolean;
  registeredCount: number;
  template: {
    id: number;
    titleZh: string;
    titleFr: string;
    questionCount: number;
    timeLimitMinutes: number | null;
    passingScore: number;
    sectionCount: number;
  };
  examiner: { id: number; name: string };
  startsAt: string | null;
  endsAt: string | null;
  openedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  participantCount: number;
  submittedCount: number;
};

export type ExamSessionParticipantView = {
  attemptId: number;
  user: { id: number; name: string };
  restaurant: { id: number; name: string };
  status: string;
  answeredCount: number;
  totalCount: number;
  score: number | null;
  passed: boolean | null;
  startedAt: string;
  deadlineAt: string | null;
  submittedAt: string | null;
  /** Sectioned papers: 0-based current section, and whether on the break before it. */
  sectionIndex: number;
  sectionCount: number;
  isOnBreak: boolean;
};

export type ExamSessionDetailView = ExamSessionView & {
  serverNow: string;
  participants: ExamSessionParticipantView[];
};

export type ExamSessionTemplateOption = {
  id: number;
  titleZh: string;
  titleFr: string;
  questionCount: number;
  timeLimitMinutes: number | null;
  sectionCount: number;
  accessMode: string;
  isActive: boolean;
};

export type SessionWithRelations = ExamSession & {
  template: ExamTemplate;
  examiner: { id: number; name: string };
};

const iso = (value: Date | null) => value?.toISOString() ?? null;

export function toSessionView(
  session: SessionWithRelations,
  counts: {
    participantCount: number;
    submittedCount: number;
    registeredCount?: number;
  },
): ExamSessionView {
  const t = session.template;
  return {
    id: session.id,
    code: session.code,
    label: session.label,
    status: session.status,
    requireRegistration: session.requireRegistration,
    template: {
      id: t.id,
      titleZh: t.titleZh,
      titleFr: t.titleFr,
      questionCount: t.singleCount + t.multipleCount + t.booleanCount,
      timeLimitMinutes: t.timeLimitMinutes,
      passingScore: t.passingScore,
      sectionCount: readBlueprint(t.blueprint)?.sections.length ?? 1,
    },
    examiner: session.examiner,
    startsAt: iso(session.startsAt),
    endsAt: iso(session.endsAt),
    openedAt: iso(session.openedAt),
    closedAt: iso(session.closedAt),
    createdAt: session.createdAt.toISOString(),
    participantCount: counts.participantCount,
    submittedCount: counts.submittedCount,
    registeredCount: counts.registeredCount ?? 0,
  };
}

export type ExamRegistrationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'ABSENT';

export type ExamRegistrationView = {
  userId: number;
  name: string;
  restaurant: { id: number; name: string };
  jobRole: string | null;
  status: ExamRegistrationStatus;
  registeredAt: string;
};

export type ExamCandidateView = {
  id: number;
  name: string;
  restaurant: { id: number; name: string };
  jobRole: string | null;
  isRegistered: boolean;
};

export type MyExamSessionView = {
  id: number;
  label: string | null;
  status: string;
  template: {
    titleZh: string;
    titleFr: string;
    timeLimitMinutes: number | null;
  };
  examiner: { name: string };
  startsAt: string | null;
  endsAt: string | null;
  attemptStatus: string | null;
};
