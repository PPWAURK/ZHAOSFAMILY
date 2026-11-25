import type {
  ExamCategory,
  ExamCategoryInput,
  ExamPaginated,
  ExamQuestion,
  ExamQuestionInput,
  ExamQuestionQuery,
  ExamQuestionStats,
  ExamReviewAction,
} from "@zhao/types";

import { apiClient } from "@/shared/api/api-client";

const QUESTIONS = "/exam-bank/questions";
const CATEGORIES = "/exam-bank/categories";

export function fetchExamQuestions(query: ExamQuestionQuery): Promise<ExamPaginated<ExamQuestion>> {
  return apiClient.get<ExamPaginated<ExamQuestion>>(QUESTIONS, { params: query });
}

const EXPORT_PAGE_SIZE = 1000;

/** Every question matching the filters (pages of 1000), for CSV export. */
export async function fetchAllExamQuestions(query: ExamQuestionQuery): Promise<ExamQuestion[]> {
  const rows: ExamQuestion[] = [];
  for (let page = 1; ; page += 1) {
    const result = await fetchExamQuestions({ ...query, page, pageSize: EXPORT_PAGE_SIZE });
    rows.push(...result.items);
    if (rows.length >= result.total || result.items.length === 0) return rows;
  }
}

export function fetchExamQuestionStats(): Promise<ExamQuestionStats> {
  return apiClient.get<ExamQuestionStats>(`${QUESTIONS}/stats`);
}

export function createExamQuestion(input: ExamQuestionInput): Promise<ExamQuestion> {
  return apiClient.post<ExamQuestion>(QUESTIONS, input);
}

export function updateExamQuestion(id: number, input: ExamQuestionInput): Promise<ExamQuestion> {
  return apiClient.patch<ExamQuestion>(`${QUESTIONS}/${id}`, input);
}

export function reviewExamQuestions(
  ids: number[],
  action: ExamReviewAction,
  reason?: string,
): Promise<{ updated: number }> {
  return apiClient.post<{ updated: number }>(`${QUESTIONS}/bulk-review`, {
    ids,
    action,
    ...(reason ? { reason } : {}),
  });
}

export function fetchExamCategories(): Promise<ExamCategory[]> {
  return apiClient.get<ExamCategory[]>(CATEGORIES);
}

export function createExamCategory(input: ExamCategoryInput): Promise<ExamCategory> {
  return apiClient.post<ExamCategory>(CATEGORIES, input);
}

export function updateExamCategory(id: number, input: ExamCategoryInput): Promise<ExamCategory> {
  return apiClient.patch<ExamCategory>(`${CATEGORIES}/${id}`, input);
}

export function deleteExamCategory(id: number): Promise<void> {
  return apiClient.delete<void>(`${CATEGORIES}/${id}`);
}
