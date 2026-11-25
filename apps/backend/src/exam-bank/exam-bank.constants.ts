export const QUESTION_TYPES = ['single', 'multiple', 'boolean'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_STATUSES = [
  'DRAFT',
  'APPROVED',
  'REJECTED',
  'ARCHIVED',
] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

/** 记忆 (recall a fact) · 理解 (judge a practice) · 情景 (on-site scenario). */
export const QUESTION_DIFFICULTIES = [
  'recall',
  'understand',
  'scenario',
] as const;
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];
export const DEFAULT_DIFFICULTY: QuestionDifficulty = 'understand';

export const QUESTION_ORIGINS = ['AI', 'MANUAL'] as const;

export const KNOWLEDGE_STATUSES = [
  'PENDING',
  'PROCESSING',
  'READY',
  'FAILED',
] as const;
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

export const JOB_STATUSES = [
  'PLANNED',
  'SUBMITTING',
  'BATCH_RUNNING',
  'INGESTING',
  'COMPLETED',
  'FAILED',
  'CANCELING',
  'CANCELED',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const ACTIVE_JOB_STATUSES: readonly JobStatus[] = [
  'PLANNED',
  'SUBMITTING',
  'BATCH_RUNNING',
  'INGESTING',
  'CANCELING',
];

export const REQUEST_STATUSES = [
  'PENDING',
  'SUBMITTED',
  'SUCCEEDED',
  'FAILED',
  'RETRY',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const ATTEMPT_STATUSES = [
  'IN_PROGRESS',
  'SUBMITTED',
  'EXPIRED',
] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const BOOLEAN_KEYS = ['true', 'false'] as const;
export const CHOICE_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;

export const KNOWLEDGE_FOLDER = 'exam-knowledge';
export const KNOWLEDGE_MIME_TYPES: Readonly<
  Record<string, 'pdf' | 'docx' | 'txt'>
> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'text/plain': 'txt',
};

export const MAX_GENERATION_ROUNDS = 3;
export const MAX_QUESTIONS_PER_REQUEST = 6;
export const DUPLICATE_SIMILARITY = 0.92;
export const SUBMIT_GRACE_MS = 60_000;
export const BULK_REVIEW_LIMIT = 200;
export const ROW_LOCK_MS = 10 * 60_000;

export const TEMPLATE_ACCESS_MODES = ['LIST', 'CODE'] as const;
export type TemplateAccessMode = (typeof TEMPLATE_ACCESS_MODES)[number];

export const SESSION_STATUSES = ['SCHEDULED', 'OPEN', 'CLOSED'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_CODE_LENGTH = 6;

export const GENERATION_MODES = ['COUNT', 'TARGET'] as const;
export type GenerationMode = (typeof GENERATION_MODES)[number];

export const MAX_BLUEPRINT_SECTIONS = 4;
export const MAX_BLUEPRINT_ITEMS = 120;
export const MAX_BREAK_MINUTES = 120;
export const KNOWLEDGE_POINT_MAX_LENGTH = 100;
