import {
  apiClient,
  API_URL,
  getAccessToken,
} from "@/shared/api/api-client";
import type {
  AiQuizConfigView,
  TrainingQuizAdminView,
  TrainingQuizDraftQuestion,
  TrainingQuizQuestionInput,
  UpdateAiConfigInput,
  UpsertTrainingQuizInput,
} from "@/features/training/types/trainingQuiz";

export async function fetchAiQuizConfig(): Promise<AiQuizConfigView> {
  return apiClient.get<AiQuizConfigView>("/training/ai-config");
}

export async function updateAiQuizConfig(
  input: UpdateAiConfigInput,
): Promise<AiQuizConfigView> {
  return apiClient.put<AiQuizConfigView>("/training/ai-config", input);
}

export type SSEProgressEvent = {
  generated: number;
  total: number;
  batchesDone: number;
  batchesTotal: number;
};

export type SSECompleteEvent = TrainingQuizDraftQuestion[];

export type SSECallbacks = {
  onProgress?: (progress: SSEProgressEvent) => void;
  onComplete?: (drafts: SSECompleteEvent) => void;
  onError?: (error: Error) => void;
};

function materialPath(materialId: number, suffix = ""): string {
  return `/training/materials/${encodeURIComponent(String(materialId))}/quiz${suffix}`;
}

export function generateTrainingQuizDraftSSE(
  materialId: number,
  callbacks: SSECallbacks,
): AbortController {
  const controller = new AbortController();
  const url = `${API_URL}${materialPath(materialId, "/generate/sse")}`;

  // Intentional raw fetch (not apiClient): this is a Server-Sent Events stream
  // read incrementally via ReadableStream.getReader(), which the axios-based
  // apiClient does not support. It still reuses the shared API_URL + access
  // token, so auth stays consistent with the rest of the client.
  fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      Accept: "text/event-stream",
    },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("SSE response body is not readable");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const dataLine = part
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (!dataLine) continue;

          const raw = dataLine.slice(6);

          try {
            const eventType = part
              .split("\n")
              .find((line) => line.startsWith("event: "))
              ?.slice(7);

            if (eventType === "progress") {
              callbacks.onProgress?.(JSON.parse(raw) as SSEProgressEvent);
            } else if (eventType === "complete") {
              callbacks.onComplete?.(JSON.parse(raw) as SSECompleteEvent);
            } else if (eventType === "error") {
              const payload = JSON.parse(raw) as { code?: string };
              callbacks.onError?.(
                new Error(payload.code || "TRAINING_QUIZ_AI_REQUEST_FAILED"),
              );
            }
          } catch {
            console.warn("[SSE] malformed event payload", raw.slice(0, 100));
          }
        }
      }
    })
    .catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
    });

  return controller;
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
