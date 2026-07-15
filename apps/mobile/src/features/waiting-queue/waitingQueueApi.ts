import { createWaitingQueueApi } from "@zhao/api";
import type {
  CreateWaitingQueueEntryRequest,
  WaitingQueueEntry,
  WaitingQueueStatus,
} from "@zhao/types";
import { mobileApiClient } from "@/lib/api";

const waitingQueueApi = createWaitingQueueApi(mobileApiClient);

export async function fetchWaitingQueue(
  status?: WaitingQueueStatus,
): Promise<WaitingQueueEntry[]> {
  const entries = await waitingQueueApi.list(status);

  return Array.isArray(entries) ? entries : [];
}

export function addWaitingQueueEntry(
  input: CreateWaitingQueueEntryRequest,
): Promise<WaitingQueueEntry> {
  return waitingQueueApi.create(input);
}

export function seatWaitingQueueEntry(
  id: number | string,
): Promise<WaitingQueueEntry> {
  return waitingQueueApi.updateStatus(id, { status: "seated" });
}

export function cancelWaitingQueueEntry(
  id: number | string,
): Promise<WaitingQueueEntry> {
  return waitingQueueApi.updateStatus(id, { status: "cancelled" });
}
