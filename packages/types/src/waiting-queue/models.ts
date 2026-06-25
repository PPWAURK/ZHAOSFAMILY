export const WAITING_QUEUE_STATUSES = [
  "waiting",
  "seated",
  "cancelled",
] as const;

export type WaitingQueueStatus = (typeof WAITING_QUEUE_STATUSES)[number];

export type WaitingQueueEntry = {
  id: number;
  restaurantId: number;
  customerName: string;
  partySize: number;
  hasDisabled: boolean;
  hasPregnant: boolean;
  hasElderly: boolean;
  note: string | null;
  status: WaitingQueueStatus;
  seatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
