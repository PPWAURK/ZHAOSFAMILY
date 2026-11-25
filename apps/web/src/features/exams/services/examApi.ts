import type {
  ExamAnswer,
  ExamAttempt,
  ExamCard,
  MyExamAttempt,
  SubmitExamAnswersInput,
} from "@zhao/types";

import { apiClient } from "@/shared/api/api-client";

export function fetchAvailableExams(): Promise<ExamCard[]> {
  return apiClient.get<ExamCard[]>("/exams");
}

/** Starts a new attempt, or resumes the one already in progress. */
export function startExamAttempt(templateId: number): Promise<ExamAttempt> {
  return apiClient.post<ExamAttempt>(`/exams/${templateId}/attempts`);
}

export function fetchExamAttempt(attemptId: number): Promise<ExamAttempt> {
  return apiClient.get<ExamAttempt>(`/exam-attempts/${attemptId}`);
}

export function fetchMyExamAttempts(): Promise<MyExamAttempt[]> {
  return apiClient.get<MyExamAttempt[]>("/exam-attempts/mine");
}

export function saveExamAnswers(
  attemptId: number,
  answers: ExamAnswer[],
): Promise<{ savedAt: string }> {
  return apiClient.put<{ savedAt: string }>(`/exam-attempts/${attemptId}/answers`, { answers });
}

/**
 * Hands in the paper, or — for a sectioned paper — the section `sectionIndex`
 * (the response is then the attempt on its break, still IN_PROGRESS).
 */
export function submitExamAttempt(
  attemptId: number,
  answers: ExamAnswer[],
  sectionIndex?: number,
): Promise<ExamAttempt> {
  const body: SubmitExamAnswersInput =
    sectionIndex === undefined ? { answers } : { answers, sectionIndex };
  return apiClient.post<ExamAttempt>(`/exam-attempts/${attemptId}/submit`, body);
}

/** Ends the break early: the section clock starts now and its questions come back. */
export function startExamSection(attemptId: number, sectionIndex: number): Promise<ExamAttempt> {
  return apiClient.post<ExamAttempt>(`/exam-attempts/${attemptId}/sections/start`, {
    sectionIndex,
  });
}
