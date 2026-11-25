import type { ExamAttemptView } from '../attempts/exam-attempt.view';

export type ExamResultRowView = {
  id: number;
  templateId: number;
  titleZh: string;
  titleFr: string;
  user: { id: number; name: string; email: string; jobRole: string | null };
  restaurant: { id: number; name: string };
  status: string;
  score: number | null;
  passed: boolean | null;
  correctCount: number | null;
  totalCount: number;
  startedAt: string;
  submittedAt: string | null;
  durationSeconds: number | null;
};

export type ExamResultDetailView = ExamAttemptView & {
  user: ExamResultRowView['user'];
  restaurant: ExamResultRowView['restaurant'];
};

export type QuestionStatView = {
  questionId: number;
  promptZh: string;
  promptFr: string;
  type: string;
  answeredCount: number;
  correctCount: number;
  correctRate: number;
};
