export const TRAINING_COURSE_SECTIONS = ['required', 'optional'] as const;
export type TrainingCourseSection = (typeof TRAINING_COURSE_SECTIONS)[number];

export const TRAINING_COURSE_TYPES = [
  'VIDEO',
  'PDF',
  'QUIZ',
  'ARTICLE',
] as const;
export type TrainingCourseType = (typeof TRAINING_COURSE_TYPES)[number];

export const TRAINING_COURSE_STATUSES = [
  'not_started',
  'in_progress',
  'completed',
] as const;
export type TrainingCourseStatus = (typeof TRAINING_COURSE_STATUSES)[number];

export type TrainingCourseItem = {
  id: string;
  section: TrainingCourseSection;
  type: TrainingCourseType;
  isRequired: boolean;
  titleCn: string;
  titleEn: string;
  durationLabel: string;
  progressPercent: number;
  status: TrainingCourseStatus;
  description: string;
  tags: string[];
};

export const TRAINING_POSITION_IDS = [
  'FOH',
  'BOH',
  'CASH',
  'SM',
  'RM',
  'ALL',
] as const;
export const TRAINING_MATERIAL_TYPES = [
  'VIDEO',
  'PDF',
  'QUIZ',
  'ARTICLE',
  'IMAGE',
  'OTHER',
] as const;

export type TrainingMaterialItem = {
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
};

export type TrainingMaterialProgressItem = {
  materialId: number;
  status: 'not_started' | 'in_progress' | 'completed';
  progressPct: number;
  lastOpenedAt: string | null;
  completedAt: string | null;
};

export type TrainingPlanMaterialItem = TrainingMaterialItem & {
  progress: TrainingMaterialProgressItem;
  hasQuiz: boolean;
};

export const TRAINING_QUIZ_QUESTION_TYPES = [
  'single',
  'multiple',
  'boolean',
] as const;
export type TrainingQuizQuestionType =
  (typeof TRAINING_QUIZ_QUESTION_TYPES)[number];

export type TrainingQuizOption = {
  key: string;
  label: string;
};

// Sent to the employee while taking the quiz — never includes correct answers.
export type TrainingQuizQuestionPublic = {
  id: number;
  type: TrainingQuizQuestionType;
  prompt: string;
  options: TrainingQuizOption[];
};

export type TrainingQuizForTaking = {
  quizId: number;
  materialId: number;
  materialTitle: string;
  passingScore: number;
  maxAttempts: number | null;
  attemptsUsed: number;
  bestScore: number | null;
  passed: boolean;
  questions: TrainingQuizQuestionPublic[];
};

export type TrainingQuizQuestionResult = {
  questionId: number;
  correct: boolean;
  correctKeys: string[];
  explanation: string | null;
};

export type TrainingTitleItem = {
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
  newTitles: TrainingTitleItem[];
};

export type TrainingMyTitles = {
  earned: TrainingTitleItem[];
  available: TrainingTitleItem[];
};

// Management view — includes the correct answers, gated by manager permission.
export type TrainingQuizQuestionAdmin = {
  id: number;
  type: TrainingQuizQuestionType;
  prompt: string;
  options: TrainingQuizOption[];
  correctKeys: string[];
  explanation: string | null;
  sortOrder: number;
};

export type TrainingQuizAdminView = {
  quizId: number;
  materialId: number;
  materialTitle: string;
  passingScore: number;
  questionCount: number;
  maxAttempts: number | null;
  questions: TrainingQuizQuestionAdmin[];
};

export type TrainingQuizDraftQuestion = {
  type: TrainingQuizQuestionType;
  prompt: string;
  options: TrainingQuizOption[];
  correctKeys: string[];
  explanation: string | null;
};

export type TrainingRecordItem = {
  materialId: number;
  title: string;
  positionId: string;
  type: string;
  isRequired: boolean;
  completedAt: string | null;
  quizScore: number | null;
};

export type TrainingMyRecords = {
  records: TrainingRecordItem[];
  titles: TrainingTitleItem[];
  completedCount: number;
};

export type TrainingPlanSummary = {
  requiredTotal: number;
  requiredCompleted: number;
  completionPercent: number;
};

export type TrainingMyPlan = {
  positionCodes: string[];
  required: TrainingPlanMaterialItem[];
  optional: TrainingPlanMaterialItem[];
  summary: TrainingPlanSummary;
};

export type TrainingStoreProgressUserItem = {
  userId: number;
  name: string;
  email: string;
  jobRole: string | null;
  requiredTotal: number;
  requiredCompleted: number;
  completionPercent: number;
  lastOpenedAt: string | null;
};

export type TrainingStoreProgress = {
  restaurant: {
    id: number;
    name: string;
  };
  users: TrainingStoreProgressUserItem[];
  summary: {
    employeeCount: number;
    completedEmployeeCount: number;
    averageCompletionPercent: number;
  };
};

export type TrainingDiagnostics = {
  unmappedJobRoles: string[];
  positionsWithoutMaterials: string[];
  orphanMaterials: string[];
  rolesResolvingToEmpty: string[];
};

export type TrainingResolvePreview = {
  jobRole: string | null;
  positionCodes: string[];
  requiredCount: number;
  optionalCount: number;
  warnings: {
    jobRole: string;
    reason: string;
  }[];
};

export type TrainingPositionItem = {
  code: string;
  name: {
    zh: string;
    en: string;
    fr: string;
  };
  parentCode: string | null;
  isActive: boolean;
  sortOrder: number;
  children: TrainingPositionItem[];
};
