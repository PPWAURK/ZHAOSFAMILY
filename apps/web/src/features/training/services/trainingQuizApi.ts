import { apiClient } from "@/shared/api/api-client";
import type {
  TrainingQuizAdminView,
  TrainingQuizDraftQuestion,
  TrainingQuizQuestionInput,
  UpsertTrainingQuizInput,
} from "@/features/training/types/trainingQuiz";

function materialPath(materialId: number, suffix = ""): string {
  return `/training/materials/${encodeURIComponent(String(materialId))}/quiz${suffix}`;
}

export async function fetchTrainingQuizAdmin(
  materialId: number,
): Promise<TrainingQuizAdminView | null> {
  return apiClient.get<TrainingQuizAdminView | null>(
    materialPath(materialId, "/manage"),
  );
}

export async function upsertTrainingQuiz(
  materialId: number,
  input: UpsertTrainingQuizInput,
): Promise<TrainingQuizAdminView> {
  return apiClient.put<TrainingQuizAdminView>(materialPath(materialId), input);
}

export async function deleteTrainingQuiz(
  materialId: number,
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(materialPath(materialId));
}

export async function addTrainingQuizQuestion(
  materialId: number,
  input: TrainingQuizQuestionInput,
): Promise<TrainingQuizAdminView> {
  return apiClient.post<TrainingQuizAdminView>(
    materialPath(materialId, "/questions"),
    input,
  );
}

export async function updateTrainingQuizQuestion(
  questionId: number,
  input: Partial<TrainingQuizQuestionInput>,
): Promise<TrainingQuizAdminView> {
  return apiClient.patch<TrainingQuizAdminView>(
    `/training/quiz-questions/${encodeURIComponent(String(questionId))}`,
    input,
  );
}

export async function deleteTrainingQuizQuestion(
  questionId: number,
): Promise<TrainingQuizAdminView> {
  return apiClient.delete<TrainingQuizAdminView>(
    `/training/quiz-questions/${encodeURIComponent(String(questionId))}`,
  );
}

export async function generateTrainingQuizDraft(
  materialId: number,
): Promise<TrainingQuizDraftQuestion[]> {
  return apiClient.post<TrainingQuizDraftQuestion[]>(
    materialPath(materialId, "/generate"),
  );
}
