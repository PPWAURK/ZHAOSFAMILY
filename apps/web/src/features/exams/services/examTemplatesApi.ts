import type {
  ExamBlueprint,
  ExamBlueprintCheck,
  ExamPoolCheck,
  ExamPoolConfigInput,
  ExamTemplate,
  ExamTemplateInput,
} from "@zhao/types";

import { apiClient } from "@/shared/api/api-client";

const BASE = "/exam-bank/templates";

export function fetchExamTemplates(): Promise<ExamTemplate[]> {
  return apiClient.get<ExamTemplate[]>(BASE);
}

export function checkExamPool(input: ExamPoolConfigInput): Promise<ExamPoolCheck> {
  return apiClient.post<ExamPoolCheck>(`${BASE}/pool-check`, input);
}

/** Required vs available APPROVED questions for every row of a sectioned paper. */
export function checkExamBlueprint(blueprint: ExamBlueprint): Promise<ExamBlueprintCheck> {
  return apiClient.post<ExamBlueprintCheck>(`${BASE}/blueprint-check`, blueprint);
}

export function createExamTemplate(input: ExamTemplateInput): Promise<ExamTemplate> {
  return apiClient.post<ExamTemplate>(BASE, input);
}

export function updateExamTemplate(id: number, input: ExamTemplateInput): Promise<ExamTemplate> {
  return apiClient.patch<ExamTemplate>(`${BASE}/${id}`, input);
}

export function deleteExamTemplate(id: number): Promise<void> {
  return apiClient.delete<void>(`${BASE}/${id}`);
}
