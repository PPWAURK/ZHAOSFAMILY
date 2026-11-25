export type ExamQuestionType = "single" | "multiple" | "boolean";
export type ExamQuestionStatus = "DRAFT" | "APPROVED" | "REJECTED" | "ARCHIVED";
/** 记忆 (recall a fact) · 理解 (judge a practice) · 情景 (on-site scenario). */
export type ExamQuestionDifficulty = "recall" | "understand" | "scenario";
export type ExamTypeCounts = Record<ExamQuestionType, number>;
export type ExamDifficultyCounts = Record<ExamQuestionDifficulty, number>;

export type ExamPaginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type KnowledgeMaterial = {
  id: number;
  title: string;
  description: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  language: string | null;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  errorCode: string | null;
  charCount: number;
  chunkCount: number;
  /** Category every question generated from this file belongs to. */
  categoryId: number | null;
  /** Bank target per difficulty; null when none is set. */
  targets: ExamDifficultyCounts | null;
  createdAt: string;
  updatedAt: string;
};

/** Targets and what the bank holds per difficulty, for one material. */
export type MaterialCoverage = {
  materialId: number;
  title: string;
  status: KnowledgeMaterial["status"];
  categoryId: number | null;
  targets: ExamDifficultyCounts | null;
  approved: ExamDifficultyCounts;
  draft: ExamDifficultyCounts;
  /** Target minus (approved + draft): what a TARGET job would generate. */
  missing: ExamDifficultyCounts;
};

export type KnowledgeChunk = {
  id: number;
  ordinal: number;
  content: string;
  tokenEstimate: number;
};

export type ExamQuestionOption = { key: string; zh: string; fr: string };

export type ExamCategory = {
  id: number;
  code: string;
  nameZh: string;
  nameFr: string;
  sortOrder: number;
  isActive: boolean;
};

export type ExamQuestion = {
  id: number;
  type: ExamQuestionType;
  status: ExamQuestionStatus;
  origin: string;
  difficulty: ExamQuestionDifficulty;
  category: ExamCategory | null;
  promptZh: string;
  promptFr: string;
  options: ExamQuestionOption[];
  correctKeys: string[];
  explanationZh: string | null;
  explanationFr: string | null;
  evidence: string | null;
  /** The single fact or rule tested; a paper never repeats one. */
  knowledgePoint: string | null;
  sourceMaterial: { id: number; title: string } | null;
  sourceChunkId: number | null;
  generationJobId: number | null;
  rejectReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExamQuestionStats = {
  byStatus: Partial<Record<ExamQuestionStatus, number>>;
  approvedByType: ExamTypeCounts;
  approvedByCategory: Array<{ categoryId: number | null; count: number }>;
};

export type GenerationJobStatus =
  | "PLANNED"
  | "SUBMITTING"
  | "BATCH_RUNNING"
  | "INGESTING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELING"
  | "CANCELED";

export type GenerationJobMode = "COUNT" | "TARGET";

export type GenerationJob = {
  id: number;
  status: GenerationJobStatus;
  mode: GenerationJobMode;
  requestedCount: number;
  plannedCount: number;
  materialIds: number[];
  typeMix: ExamTypeCounts;
  model: string;
  round: number;
  totalRequests: number;
  succeededRequests: number;
  failedRequests: number;
  generatedCount: number;
  keptCount: number;
  duplicateCount: number;
  invalidCount: number;
  draftCount: number;
  inputTokens: number;
  outputTokens: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type GenerationEstimate = {
  plannedCount: number;
  requestCount: number;
  maxPossible: number;
  isCapped: boolean;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number | null;
};

export type ExamTemplate = {
  id: number;
  titleZh: string;
  titleFr: string;
  descriptionZh: string | null;
  descriptionFr: string | null;
  singleCount: number;
  multipleCount: number;
  booleanCount: number;
  questionCount: number;
  categoryIds: number[];
  materialIds: number[];
  difficulties: ExamQuestionDifficulty[];
  timeLimitMinutes: number | null;
  passingScore: number;
  maxAttempts: number | null;
  shuffleOptions: boolean;
  showExplanations: boolean;
  isActive: boolean;
  /** LIST: shown in the exam list. CODE: only reachable through a session join code. */
  accessMode: ExamTemplateAccessMode;
  /** Sectioned paper rules; null for a simple template. */
  blueprint: ExamBlueprint | null;
  sectionCount: number;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
};

/** Questions drawn from one knowledge material; `difficulty` fixes the split. */
export type ExamBlueprintItem = {
  materialId: number;
  count: number;
  difficulty: ExamDifficultyCounts | null;
};

export type ExamBlueprintSection = {
  titleZh: string;
  titleFr: string;
  timeLimitMinutes: number | null;
  /** Exact number of each question type; must add up to the items' counts. */
  typeCounts: ExamTypeCounts;
  items: ExamBlueprintItem[];
};

/** The paper fails when more than `maxWrong` questions of the category are wrong. */
export type ExamBlueprintRule = { categoryId: number; maxWrong: number };

/**
 * Sectioned paper: sections taken one after another with a break between,
 * a fixed number of questions per knowledge material (optionally per
 * difficulty), exact type totals per section, and veto rules.
 */
export type ExamBlueprint = {
  sections: ExamBlueprintSection[];
  breakMinutes: number;
  rules: ExamBlueprintRule[];
};

export type ExamBlueprintCheck = {
  isSufficient: boolean;
  sections: Array<{
    index: number;
    requiredTypes: ExamTypeCounts;
    /** False when every file has enough questions but the type totals cannot be met. */
    isTypeMixFeasible: boolean;
    items: Array<{
      materialId: number;
      materialTitle: string | null;
      count: number;
      isSufficient: boolean;
      cells: Array<{
        difficulty: ExamQuestionDifficulty | null;
        required: number;
        available: number;
      }>;
    }>;
  }>;
};

export type ExamPoolCheck = {
  requested: ExamTypeCounts;
  available: ExamTypeCounts;
  isSufficient: boolean;
};

export type ExamCard = {
  templateId: number;
  titleZh: string;
  titleFr: string;
  descriptionZh: string | null;
  descriptionFr: string | null;
  questionCount: number;
  timeLimitMinutes: number | null;
  /** 1 for a simple paper. */
  sectionCount: number;
  passingScore: number;
  maxAttempts: number | null;
  attemptsUsed: number;
  bestScore: number | null;
  hasPassed: boolean;
  inProgressAttemptId: number | null;
};

export type ExamAnswer = { questionId: number; selectedKeys: string[] };

export type ExamAttemptQuestion = {
  id: number;
  type: ExamQuestionType;
  promptZh: string;
  promptFr: string;
  options: ExamQuestionOption[];
};

export type ExamAttemptResultItem = ExamAttemptQuestion & {
  selectedKeys: string[];
  correctKeys: string[];
  isCorrect: boolean;
  explanationZh: string | null;
  explanationFr: string | null;
};

export type ExamAttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";

export type ExamAttemptSection = {
  titleZh: string;
  titleFr: string;
  timeLimitMinutes: number | null;
  questionCount: number;
};

export type ExamSectionScore = {
  titleZh: string;
  titleFr: string;
  correctCount: number;
  totalCount: number;
};

export type ExamRuleResult = {
  categoryId: number;
  labelZh: string;
  labelFr: string;
  maxWrong: number;
  totalCount: number;
  wrongCount: number;
  passed: boolean;
};

export type ExamAttempt = {
  id: number;
  templateId: number;
  titleZh: string;
  titleFr: string;
  status: ExamAttemptStatus;
  passingScore: number;
  totalCount: number;
  startedAt: string;
  deadlineAt: string | null;
  submittedAt: string | null;
  serverNow: string;
  /** Every answer of the paper, all sections included. */
  answers: ExamAnswer[];
  /** Sectioned papers: every section in order; null for a single-section paper. */
  sections: ExamAttemptSection[] | null;
  /** 0-based current section (always 0 for a single-section paper). */
  sectionIndex: number;
  /**
   * Set while on the break before `sectionIndex`: questions are hidden until
   * then, and `deadlineAt` is already the section deadline.
   */
  breakEndsAt: string | null;
  /** While IN_PROGRESS: the current section's questions (empty during a break). */
  questions: ExamAttemptQuestion[] | null;
  result: {
    score: number;
    passed: boolean;
    correctCount: number;
    showExplanations: boolean;
    /** Per-section scores for a sectioned paper. */
    sections: ExamSectionScore[] | null;
    /** Veto rules: a failed one fails the paper whatever the score. */
    rules: ExamRuleResult[];
    items: ExamAttemptResultItem[];
  } | null;
};

export type MyExamAttempt = {
  id: number;
  templateId: number;
  titleZh: string;
  titleFr: string;
  status: ExamAttemptStatus;
  score: number | null;
  passed: boolean | null;
  totalCount: number;
  startedAt: string;
  submittedAt: string | null;
};

export type ExamResultRow = {
  id: number;
  templateId: number;
  titleZh: string;
  titleFr: string;
  user: { id: number; name: string; email: string; jobRole: string | null };
  restaurant: { id: number; name: string };
  status: ExamAttemptStatus;
  score: number | null;
  passed: boolean | null;
  correctCount: number | null;
  totalCount: number;
  startedAt: string;
  submittedAt: string | null;
  durationSeconds: number | null;
};

export type ExamResultDetail = ExamAttempt & {
  user: ExamResultRow["user"];
  restaurant: ExamResultRow["restaurant"];
};

export type ExamQuestionStat = {
  questionId: number;
  promptZh: string;
  promptFr: string;
  type: ExamQuestionType;
  answeredCount: number;
  correctCount: number;
  correctRate: number;
};

export type ExamTemplateAccessMode = "LIST" | "CODE";

export type ExamSessionStatus = "SCHEDULED" | "OPEN" | "CLOSED";

export type ExamSession = {
  id: number;
  code: string;
  label: string | null;
  status: ExamSessionStatus;
  /** When true only users on the roster can join with the code. */
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

export type ExamSessionParticipant = {
  attemptId: number;
  user: { id: number; name: string };
  restaurant: { id: number; name: string };
  status: ExamAttemptStatus;
  answeredCount: number;
  totalCount: number;
  score: number | null;
  passed: boolean | null;
  startedAt: string;
  deadlineAt: string | null;
  submittedAt: string | null;
  /** 0-based current section, and whether the employee is on the break before it. */
  sectionIndex: number;
  sectionCount: number;
  isOnBreak: boolean;
};

export type ExamSessionDetail = ExamSession & {
  serverNow: string;
  participants: ExamSessionParticipant[];
};

export type ExamRegistrationStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "ABSENT";

export type ExamSessionRegistration = {
  userId: number;
  name: string;
  restaurant: { id: number; name: string };
  jobRole: string | null;
  status: ExamRegistrationStatus;
  registeredAt: string;
};

export type ExamSessionCandidate = {
  id: number;
  name: string;
  restaurant: { id: number; name: string };
  jobRole: string | null;
  isRegistered: boolean;
};

/** A session the signed-in employee was put on; never carries the join code. */
export type MyExamSession = {
  id: number;
  label: string | null;
  status: ExamSessionStatus;
  template: { titleZh: string; titleFr: string; timeLimitMinutes: number | null };
  examiner: { name: string };
  startsAt: string | null;
  endsAt: string | null;
  attemptStatus: ExamAttemptStatus | null;
};

export type ExamSessionTemplateOption = {
  id: number;
  titleZh: string;
  titleFr: string;
  questionCount: number;
  timeLimitMinutes: number | null;
  sectionCount: number;
  accessMode: ExamTemplateAccessMode;
  isActive: boolean;
};
