import type {
  CreateExamSessionInput,
  ExamAttempt,
  ExamSession,
  ExamSessionCandidate,
  ExamSessionCandidateQuery,
  ExamSessionDetail,
  ExamSessionRegistration,
  ExamSessionTemplateOption,
  MyExamSession,
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

export function fetchRegistrations(sessionId: number): Promise<ExamSessionRegistration[]> {
  return apiClient.get<ExamSessionRegistration[]>(`${BASE}/${sessionId}/registrations`);
}

export function addRegistrations(sessionId: number, userIds: number[]): Promise<{ added: number }> {
  return apiClient.post<{ added: number }>(`${BASE}/${sessionId}/registrations`, { userIds });
}

export function removeRegistration(sessionId: number, userId: number): Promise<void> {
  return apiClient.delete<void>(`${BASE}/${sessionId}/registrations/${userId}`);
}

export function fetchCandidates(query: ExamSessionCandidateQuery): Promise<ExamSessionCandidate[]> {
  const params = new URLSearchParams();
  if (query.restaurantId) params.set("restaurantId", String(query.restaurantId));
  if (query.jobRole) params.set("jobRole", query.jobRole);
  if (query.q) params.set("q", query.q);
  if (query.sessionId) params.set("sessionId", String(query.sessionId));
  return apiClient.get<ExamSessionCandidate[]>(`${BASE}/candidates?${params.toString()}`);
}

/** Employee: sessions the examiner put me on that have not ended. */
export function fetchMySessions(): Promise<MyExamSession[]> {
  return apiClient.get<MyExamSession[]>("/exams/sessions/mine");
}
