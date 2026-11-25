import type {
  CreateGenerationJobInput,
  GenerationEstimate,
  GenerationJob,
  MaterialCoverage,
} from "@zhao/types";

import { apiClient } from "@/shared/api/api-client";

const BASE = "/exam-bank/generation-jobs";

export function estimateGenerationJob(
  input: CreateGenerationJobInput,
): Promise<GenerationEstimate> {
  return apiClient.post<GenerationEstimate>(`${BASE}/estimate`, input);
}

export function createGenerationJob(input: CreateGenerationJobInput): Promise<GenerationJob> {
  return apiClient.post<GenerationJob>(BASE, input);
}

export function fetchGenerationJobs(): Promise<GenerationJob[]> {
  return apiClient.get<GenerationJob[]>(BASE);
}

export function cancelGenerationJob(id: number): Promise<GenerationJob> {
  return apiClient.post<GenerationJob>(`${BASE}/${id}/cancel`);
}

/** Targets and bank counts per difficulty, for every knowledge material. */
export function fetchGenerationCoverage(): Promise<MaterialCoverage[]> {
  return apiClient.get<MaterialCoverage[]>(`${BASE}/coverage`);
}
