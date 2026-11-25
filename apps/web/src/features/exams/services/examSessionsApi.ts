import type {
  CreateExamSessionInput,
  ExamAttempt,
  ExamSession,
  ExamSessionDetail,
  ExamSessionTemplateOption,
} from "@zhao/types";

import { apiClient } from "@/shared/api/api-client";

const BASE = "/exam-sessions";

export function fetchSessionTemplates(): Promise<ExamSessionTemplateOption[]> {
  return apiClient.get<ExamSessionTemplateOption[]>(`${BASE}/templates`);
}

export function fetchExamSessions(): Promise<ExamSession[]> {
  return apiClient.get<ExamSession[]>(BASE);
}

export function createExamSession(input: CreateExamSessionInput): Promise<ExamSession> {
  return apiClient.post<ExamSession>(BASE, input);
}

export function fetchExamSession(id: number): Promise<ExamSessionDetail> {
  return apiClient.get<ExamSessionDetail>(`${BASE}/${id}`);
}

export function openExamSession(id: number): Promise<ExamSessionDetail> {
  return apiClient.post<ExamSessionDetail>(`${BASE}/${id}/open`);
}

/** Ends the session and force-submits every running paper. */
export function closeExamSession(id: number): Promise<ExamSessionDetail> {
  return apiClient.post<ExamSessionDetail>(`${BASE}/${id}/close`);
}

/** Employee: enter the examiner's 6-digit code to start or resume the paper. */
export function joinExamSession(code: string): Promise<ExamAttempt> {
  return apiClient.post<ExamAttempt>("/exams/sessions/join", { code });
}
