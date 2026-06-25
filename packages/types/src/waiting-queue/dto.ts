export type CreateWaitingQueueEntryRequest = {
  customerName: string;
  partySize: number;
  hasDisabled?: boolean;
  hasPregnant?: boolean;
  hasElderly?: boolean;
  note?: string;
};

export type UpdateWaitingQueueEntryStatusRequest = {
  status: "seated" | "cancelled";
};
