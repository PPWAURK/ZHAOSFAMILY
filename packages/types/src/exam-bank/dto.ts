import type {
  ExamAnswer,
  ExamBlueprint,
  ExamDifficultyCounts,
  ExamQuestionDifficulty,
  ExamQuestionOption,
  ExamQuestionStatus,
  ExamQuestionType,
  ExamTemplateAccessMode,
  ExamTypeCounts,
  GenerationJobMode,
} from "./models";

export type CreateGenerationJobInput = {
  /** COUNT (default) needs `count`; TARGET fills the materials' per-difficulty targets. */
  mode?: GenerationJobMode;
  materialIds: number[];
  count?: number;
  typeMix?: ExamTypeCounts;
};

export type UpdateKnowledgeMaterialInput = {
  title?: string;
  description?: string | null;
  categoryId?: number | null;
  /** null clears the targets. */
  targets?: ExamDifficultyCounts | null;
};

export type ExamQuestionInput = {
  type?: ExamQuestionType;
  difficulty?: ExamQuestionDifficulty;
  categoryId?: number | null;
  promptZh?: string;
  promptFr?: string;
  options?: ExamQuestionOption[];
  correctKeys?: string[];
  explanationZh?: string | null;
  explanationFr?: string | null;
  knowledgePoint?: string | null;
};

export type ExamQuestionQuery = {
  status?: ExamQuestionStatus;
  type?: ExamQuestionType;
  difficulty?: ExamQuestionDifficulty;
  categoryId?: number;
  materialId?: number;
  jobId?: number;
  q?: string;
  page?: number;
  pageSize?: number;
};

export type ExamReviewAction = "approve" | "reject" | "archive";

export type ExamCategoryInput = {
  code?: string;
  nameZh?: string;
  nameFr?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type ExamPoolConfigInput = {
  singleCount?: number;
  multipleCount?: number;
  booleanCount?: number;
  categoryIds?: number[] | null;
  materialIds?: number[] | null;
  difficulties?: ExamQuestionDifficulty[] | null;
};

export type ExamTemplateInput = ExamPoolConfigInput & {
  titleZh?: string;
  titleFr?: string;
  descriptionZh?: string | null;
  descriptionFr?: string | null;
  timeLimitMinutes?: number | null;
  passingScore?: number;
  maxAttempts?: number | null;
  shuffleOptions?: boolean;
  showExplanations?: boolean;
  isActive?: boolean;
  accessMode?: ExamTemplateAccessMode;
  /** Sectioned paper; replaces counts and filters. null switches back to simple mode. */
  blueprint?: ExamBlueprint | null;
};

export type CreateExamSessionInput = {
  templateId: number;
  label?: string;
  startsAt?: string;
  endsAt?: string;
};

export type ExamAnswersInput = { answers: ExamAnswer[] };

/** Sectioned papers name the section handed in, so a repeated tap is harmless. */
export type SubmitExamAnswersInput = ExamAnswersInput & { sectionIndex?: number };

export type ExamResultQuery = {
  templateId?: number;
  restaurantId?: number;
  userId?: number;
  passed?: boolean;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};
