import type {
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
} from './exam-bank.constants';

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type KnowledgeMaterialView = {
  id: number;
  title: string;
  description: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  language: string | null;
  status: string;
  errorCode: string | null;
  charCount: number;
  chunkCount: number;
  categoryId: number | null;
  /** Bank target per difficulty; null when none is set. */
  targets: Record<QuestionDifficulty, number> | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeChunkView = {
  id: number;
  ordinal: number;
  content: string;
  tokenEstimate: number;
};

export type QuestionOption = { key: string; zh: string; fr: string };

export type ExamCategoryView = {
  id: number;
  code: string;
  nameZh: string;
  nameFr: string;
  sortOrder: number;
  isActive: boolean;
};

export type ExamQuestionView = {
  id: number;
  type: QuestionType;
  status: QuestionStatus;
  origin: string;
  difficulty: QuestionDifficulty;
  category: ExamCategoryView | null;
  promptZh: string;
  promptFr: string;
  options: QuestionOption[];
  correctKeys: string[];
  explanationZh: string | null;
  explanationFr: string | null;
  evidence: string | null;
  knowledgePoint: string | null;
  sourceMaterial: { id: number; title: string } | null;
  sourceChunkId: number | null;
  generationJobId: number | null;
  rejectReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestionStatsView = {
  byStatus: Record<string, number>;
  approvedByType: Record<QuestionType, number>;
  approvedByCategory: Array<{ categoryId: number | null; count: number }>;
};

export type TypeMix = Record<QuestionType, number>;
