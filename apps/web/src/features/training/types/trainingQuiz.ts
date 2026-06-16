export type TrainingQuizQuestionType = "single" | "multiple" | "boolean";

export const QUIZ_LANGUAGES = ["zh", "fr", "bn"] as const;
export type QuizLanguage = (typeof QUIZ_LANGUAGES)[number];
export type LocalizedText = Partial<Record<QuizLanguage, string>>;

export const QUIZ_LANGUAGE_LABELS: Record<QuizLanguage, string> = {
  zh: "中文",
  fr: "Français",
  bn: "বাংলা",
};

export type TrainingQuizOption = {
  key: string;
  label: string;
};

export type TrainingQuizTranslations = {
  prompt: LocalizedText;
  options: Record<string, LocalizedText>;
  explanation?: LocalizedText | null;
};

export type TrainingQuizQuestionAdmin = {
  id: number;
  type: TrainingQuizQuestionType;
  prompt: string;
  options: TrainingQuizOption[];
  correctKeys: string[];
  explanation: string | null;
  sortOrder: number;
  translations: TrainingQuizTranslations | null;
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

export type TrainingQuizDraftOption = {
  key: string;
  label: LocalizedText;
};

export type TrainingQuizDraftQuestion = {
  type: TrainingQuizQuestionType;
  prompt: LocalizedText;
  options: TrainingQuizDraftOption[];
  correctKeys: string[];
  explanation: LocalizedText | null;
};

export type UpsertTrainingQuizInput = {
  passingScore: number;
  questionCount: number;
  maxAttempts: number | null;
};

export type AiQuizConfigView = {
  hasApiKey: boolean;
  apiKeyMasked: string;
  apiKeySource: "db" | "env" | "none";
  baseUrl: string;
  model: string;
  maxTokens: number;
};

export type UpdateAiConfigInput = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
};

export type TrainingQuizQuestionInput = {
  type: TrainingQuizQuestionType;
  prompt: string;
  options: TrainingQuizOption[];
  correctKeys: string[];
  explanation: string | null;
  sortOrder?: number;
  translations?: TrainingQuizTranslations | null;
};
