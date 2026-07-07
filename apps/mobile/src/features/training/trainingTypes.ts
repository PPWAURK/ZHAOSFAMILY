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

export const QUIZ_LANGUAGES = ["zh", "fr", "bn"] as const;
export type QuizLanguage = (typeof QUIZ_LANGUAGES)[number];
export type LocalizedText = Partial<Record<QuizLanguage, string>>;

export type TrainingQuizTranslations = {
  prompt: LocalizedText;
  options: Record<string, LocalizedText>;
  explanation?: LocalizedText | null;
};

export type TrainingQuizQuestion = {
  id: number;
  type: TrainingQuizQuestionType;
  prompt: string;
  options: TrainingQuizOption[];
  translations: TrainingQuizTranslations | null;
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

export type TrainingBadge = {
  code: string;
  name: {
    zh: string;
    en: string;
    fr: string;
  };
  track: string;
  rarity: string;
  level: number | null;
  iconType: string;
  status: "locked" | "in_progress" | "certified" | "failed";
  progress: number;
  maxProgress: number;
  completionRate: number;
  score: number | null;
  earnedAt: string | null;
};

export type TrainingQuizAttemptResult = {
  score: number;
  passed: boolean;
  attemptsUsed: number;
  materialCompleted: boolean;
  results: TrainingQuizQuestionResult[];
  newTitles: TrainingTitle[];
  newBadges: TrainingBadge[];
};

export type TrainingMyTitles = {
  earned: TrainingTitle[];
  available: TrainingTitle[];
  equippedTitleCode: string | null;
  equippedTitle: TrainingTitle | null;
};

export type TrainingRecord = {
  materialId: number;
  title: string;
  positionId: string;
  type: string;
  isRequired: boolean;
  description: string | null;
  originalName: string;
  mimeType: string;
  objectKey: string;
  sizeBytes: string;
  bucket: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  hasQuiz: boolean;
  quizPassed: boolean;
  bestQuizScore: number | null;
  quizAttemptsUsed: number;
  quizScore: number | null;
};

export type TrainingMyRecords = {
  records: TrainingRecord[];
  titles: TrainingTitle[];
  completedCount: number;
};

// ── Three-layer map types ──

export type TrainingMapLayer = "shared" | "required" | "advanced";

export type TrainingMapProgressSummary = {
  sharedTotal: number;
  sharedCompleted: number;
  requiredTotal: number;
  requiredCompleted: number;
  advancedTotal: number;
  advancedCompleted: number;
  overallPercent: number;
};

export type TrainingMapMaterialNode = {
  material: TrainingPlanMaterial;
  isCompleted: boolean;
  isQuizPassed: boolean;
  hasQuiz: boolean;
};

export type TrainingPositionGate = {
  positionId: string;
  positionLabel: string;
  materials: TrainingMapMaterialNode[];
  completedCount: number;
  totalCount: number;
  layer: TrainingMapLayer;
};

export type TrainingMapData = {
  sharedMaterials: TrainingMapMaterialNode[];
  positionGates: TrainingPositionGate[];
  advancedMaterials: TrainingMapMaterialNode[];
  summary: TrainingMapProgressSummary;
  layer1Unlocked: boolean;
  layer2Unlocked: boolean;
  layer3Unlocked: boolean;
};
