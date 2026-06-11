export type TrainingMaterialProgress = {
  materialId: number;
  status: "not_started" | "in_progress" | "completed";
  progressPct: number;
  lastOpenedAt: string | null;
  completedAt: string | null;
};

export type TrainingPlanMaterial = {
  id: number;
  positionId: string;
  type: string;
  isRequired: boolean;
  title: string;
  description: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  bucket: string;
  objectKey: string;
  createdAt: string;
  updatedAt: string;
  progress: TrainingMaterialProgress;
  hasQuiz: boolean;
};

export type TrainingPlanSummary = {
  requiredTotal: number;
  requiredCompleted: number;
  completionPercent: number;
};

export type TrainingPlan = {
  positionCodes: string[];
  required: TrainingPlanMaterial[];
  optional: TrainingPlanMaterial[];
  summary: TrainingPlanSummary;
};

export type UpdateTrainingProgressInput = {
  status?: "not_started" | "in_progress" | "completed";
  progressPct?: number;
};

export type TrainingQuizQuestionType = "single" | "multiple" | "boolean";

export type TrainingQuizOption = {
  key: string;
  label: string;
};

export type TrainingQuizQuestion = {
  id: number;
  type: TrainingQuizQuestionType;
  prompt: string;
  options: TrainingQuizOption[];
};

export type TrainingQuiz = {
  quizId: number;
  materialId: number;
  materialTitle: string;
  passingScore: number;
  maxAttempts: number | null;
  attemptsUsed: number;
  bestScore: number | null;
  passed: boolean;
  questions: TrainingQuizQuestion[];
};

export type TrainingQuizAnswer = {
  questionId: number;
  selectedKeys: string[];
};

export type TrainingQuizQuestionResult = {
  questionId: number;
  correct: boolean;
  correctKeys: string[];
  explanation: string | null;
};

export type TrainingTitle = {
  code: string;
  name: {
    zh: string;
    en: string;
    fr: string;
  };
  frameStyle: string;
  unlockPositionCode: string;
  earned: boolean;
  earnedAt: string | null;
};

export type TrainingQuizAttemptResult = {
  score: number;
  passed: boolean;
  attemptsUsed: number;
  materialCompleted: boolean;
  results: TrainingQuizQuestionResult[];
  newTitles: TrainingTitle[];
};

export type TrainingMyTitles = {
  earned: TrainingTitle[];
  available: TrainingTitle[];
};

export type TrainingRecord = {
  materialId: number;
  title: string;
  positionId: string;
  type: string;
  isRequired: boolean;
  completedAt: string | null;
  quizScore: number | null;
};

export type TrainingMyRecords = {
  records: TrainingRecord[];
  titles: TrainingTitle[];
  completedCount: number;
};
