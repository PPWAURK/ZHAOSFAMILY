export const RECRUITMENT_CONTRACT_TYPES = ['full_time', 'part_time'] as const;

export const RECRUITMENT_POSITIONS = [
  'waiter',
  'chef',
  'kitchen_assistant',
] as const;

export const RECRUITMENT_REQUEST_STATUSES = [
  'pending',
  'in_progress',
  'completed',
] as const;

export type RecruitmentContractType =
  (typeof RECRUITMENT_CONTRACT_TYPES)[number];

export type RecruitmentPosition = (typeof RECRUITMENT_POSITIONS)[number];

export type RecruitmentRequestStatus =
  (typeof RECRUITMENT_REQUEST_STATUSES)[number];

export type RecruitmentRequestActor = {
  id: number;
  restaurantId: number;
  permissions: string[];
};

export type RecruitmentRequestUser = {
  id: number;
  name: string;
  email: string;
};

export type RecruitmentRequestItem = {
  id: number;
  restaurantId: number;
  restaurantName: string;
  createdBy: RecruitmentRequestUser;
  contractType: RecruitmentContractType;
  position: RecruitmentPosition;
  headcount: number;
  notes: string | null;
  status: RecruitmentRequestStatus;
  handledNotes: string | null;
  handledBy: RecruitmentRequestUser | null;
  handledAt: string | null;
  createdAt: string;
  updatedAt: string;
};
