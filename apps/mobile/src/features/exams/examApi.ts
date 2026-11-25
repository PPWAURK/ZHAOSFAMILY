import type {
  ExamAnswer,
  ExamAttempt,
  ExamCard,
  MyExamAttempt,
  SubmitExamAnswersInput,
} from "@zhao/types";

import { mobileApiClient } from "@/lib/api";

export function fetchAvailableExams(): Promise<ExamCard[]> {
  return mobileApiClient.get<ExamCard[]>("/exams");
}

/** Starts a new attempt, or resumes the one already in progress. */
export function startExamAttempt(templateId: number): Promise<ExamAttempt> {
  return mobileApiClient.post<ExamAttempt>(`/exams/${templateId}/attempts`);
}

export function fetchExamAttempt(attemptId: number): Promise<ExamAttempt> {
  return mobileApiClient.get<ExamAttempt>(`/exam-attempts/${attemptId}`);
}

export function fetchMyExamAttempts(): Promise<MyExamAttempt[]> {
  return mobileApiClient.get<MyExamAttempt[]>("/exam-attempts/mine");
}

export function saveExamAnswers(
  attemptId: number,
  answers: ExamAnswer[],
): Promise<{ savedAt: string }> {
  return mobileApiClient.put<{ savedAt: string }>(`/exam-attempts/${attemptId}/answers`, {
    answers,
  });
}

/**
 * Sectioned papers name the section handed in (`sectionIndex`): a non-last
 * section returns the attempt on the break, the last one returns it graded.
 */
export function submitExamAttempt(
  attemptId: number,
  answers: ExamAnswer[],
  sectionIndex?: number,
): Promise<ExamAttempt> {
  const body: SubmitExamAnswersInput =
    sectionIndex === undefined ? { answers } : { answers, sectionIndex };
  return mobileApiClient.post<ExamAttempt>(`/exam-attempts/${attemptId}/submit`, body);
}

/** Ends the break early: the section clock starts now and its questions come back. */
export function startExamSection(attemptId: number, sectionIndex: number): Promise<ExamAttempt> {
  return mobileApiClient.post<ExamAttempt>(`/exam-attempts/${attemptId}/sections/start`, {
    sectionIndex,
  });
}

/** Enter the examiner's 6-digit code to start or resume that session's paper. */
export function joinExamSession(code: string): Promise<ExamAttempt> {
  return mobileApiClient.post<ExamAttempt>("/exams/sessions/join", { code });
}
