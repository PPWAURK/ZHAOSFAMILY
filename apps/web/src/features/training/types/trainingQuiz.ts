export type TrainingQuizQuestionType = "single" | "multiple" | "boolean";

export type TrainingQuizOption = {
  key: string;
  label: string;
};

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

export type UpsertTrainingQuizInput = {
  passingScore: number;
  questionCount: number;
  maxAttempts: number | null;
};

export type TrainingQuizQuestionInput = {
  type: TrainingQuizQuestionType;
  prompt: string;
  options: TrainingQuizOption[];
  correctKeys: string[];
  explanation: string | null;
  sortOrder?: number;
};
