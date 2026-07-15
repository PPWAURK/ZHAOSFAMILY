import type {
  CreateWaitingQueueEntryRequest,
  UpdateWaitingQueueEntryStatusRequest,
  WaitingQueueEntry,
  WaitingQueueStatus,
} from "@zhao/types";
import type { ApiClient } from "../client";

export type WaitingQueueApi = {
  list: (status?: WaitingQueueStatus) => Promise<WaitingQueueEntry[]>;
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
    list: (status) =>
      apiClient.get<WaitingQueueEntry[]>("/waiting-queue", {
        params: status ? { status } : undefined,
      }),
    create: (input) =>
      apiClient.post<WaitingQueueEntry>("/waiting-queue", input),
    updateStatus: (id, input) =>
      apiClient.patch<WaitingQueueEntry>(
        `/waiting-queue/${encodeURIComponent(id)}`,
        input,
      ),
  };
}
