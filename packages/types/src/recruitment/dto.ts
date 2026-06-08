import type {
  RecruitmentContractType,
  RecruitmentPosition,
  RecruitmentRequestStatus,
} from "./models";

export type CreateRecruitmentRequestRequest = {
  contractType: RecruitmentContractType;
  position: RecruitmentPosition;
  headcount: number;
  notes?: string;
};

export type ListRecruitmentRequestsQuery = {
  status?: RecruitmentRequestStatus;
};

export type UpdateRecruitmentRequestRequest = {
  status?: RecruitmentRequestStatus;
  handledNotes?: string;
};
