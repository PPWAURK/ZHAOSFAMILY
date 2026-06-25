import type {
  CreateWaitingQueueEntryRequest,
  UpdateWaitingQueueEntryStatusRequest,
  WaitingQueueEntry,
} from "@zhao/types";
import type { ApiClient } from "../client";

export type WaitingQueueApi = {
  list: () => Promise<WaitingQueueEntry[]>;
  create: (
    input: CreateWaitingQueueEntryRequest,
  ) => Promise<WaitingQueueEntry>;
  updateStatus: (
    id: number | string,
    input: UpdateWaitingQueueEntryStatusRequest,
  ) => Promise<WaitingQueueEntry>;
};

export function createWaitingQueueApi(apiClient: ApiClient): WaitingQueueApi {
  return {
    list: () => apiClient.get<WaitingQueueEntry[]>("/waiting-queue"),
    create: (input) =>
      apiClient.post<WaitingQueueEntry>("/waiting-queue", input),
    updateStatus: (id, input) =>
      apiClient.patch<WaitingQueueEntry>(
        `/waiting-queue/${encodeURIComponent(id)}`,
        input,
      ),
  };
}
