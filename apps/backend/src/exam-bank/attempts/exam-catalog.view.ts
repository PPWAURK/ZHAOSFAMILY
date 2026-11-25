export type ExamCardView = {
  templateId: number;
  titleZh: string;
  titleFr: string;
  descriptionZh: string | null;
  descriptionFr: string | null;
  questionCount: number;
  timeLimitMinutes: number | null;
  /** 1 for a simple paper; sectioned papers are taken section by section. */
  sectionCount: number;
  passingScore: number;
  maxAttempts: number | null;
  attemptsUsed: number;
  bestScore: number | null;
  hasPassed: boolean;
  inProgressAttemptId: number | null;
};

export type MyAttemptView = {
  id: number;
  templateId: number;
  titleZh: string;
  titleFr: string;
  status: string;
  score: number | null;
  passed: boolean | null;
  totalCount: number;
  startedAt: string;
  submittedAt: string | null;
};
