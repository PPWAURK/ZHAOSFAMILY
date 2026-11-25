import type {
  ExamPaginated,
  ExamQuestionStat,
  ExamResultDetail,
  ExamResultQuery,
  ExamResultRow,
} from "@zhao/types";

import { apiClient } from "@/shared/api/api-client";

export function fetchExamResults(query: ExamResultQuery): Promise<ExamPaginated<ExamResultRow>> {
  return apiClient.get<ExamPaginated<ExamResultRow>>("/exam-bank/results", { params: query });
}

export function fetchExamResultDetail(attemptId: number): Promise<ExamResultDetail> {
  return apiClient.get<ExamResultDetail>(`/exam-bank/results/${attemptId}`);
}

export function fetchExamQuestionStatistics(templateId: number): Promise<ExamQuestionStat[]> {
  return apiClient.get<ExamQuestionStat[]>(`/exam-bank/templates/${templateId}/question-stats`);
}
