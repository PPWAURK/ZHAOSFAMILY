import type {
  ExamPaginated,
  KnowledgeChunk,
  KnowledgeMaterial,
  UpdateKnowledgeMaterialInput,
} from "@zhao/types";

import { apiClient } from "@/shared/api/api-client";

const BASE = "/exam-bank/knowledge-materials";

export function fetchKnowledgeMaterials(): Promise<KnowledgeMaterial[]> {
  return apiClient.get<KnowledgeMaterial[]>(BASE);
}

export function uploadKnowledgeMaterial(input: {
  file: File;
  /** Omitted: the server uses the file name without its extension. */
  title?: string;
  description?: string;
  categoryId?: number;
}): Promise<KnowledgeMaterial> {
  const formData = new FormData();
  formData.append("file", input.file);
  if (input.title) formData.append("title", input.title);
  if (input.description) formData.append("description", input.description);
  if (input.categoryId) formData.append("categoryId", String(input.categoryId));
  return apiClient.upload<KnowledgeMaterial>(BASE, formData);
}

/** Title, category and per-difficulty targets; `targets: null` clears them. */
export function updateKnowledgeMaterial(
  id: number,
  input: UpdateKnowledgeMaterialInput,
): Promise<KnowledgeMaterial> {
  return apiClient.patch<KnowledgeMaterial>(`${BASE}/${id}`, input);
}

export function fetchKnowledgeChunks(
  id: number,
  page: number,
  pageSize = 10,
): Promise<ExamPaginated<KnowledgeChunk>> {
  return apiClient.get<ExamPaginated<KnowledgeChunk>>(`${BASE}/${id}/chunks`, {
    params: { page, pageSize },
  });
}

export function reprocessKnowledgeMaterial(id: number): Promise<KnowledgeMaterial> {
  return apiClient.post<KnowledgeMaterial>(`${BASE}/${id}/reprocess`);
}

export function deleteKnowledgeMaterial(id: number): Promise<void> {
  return apiClient.delete<void>(`${BASE}/${id}`);
}
