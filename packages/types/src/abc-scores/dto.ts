import type { AbcCycleStatus, AbcGrade } from "./models";

export type CreateAbcCycleRequest = {
  label: string;
};

export type RecordAbcInspectionRequest = {
  grade: AbcGrade;
  notes?: string;
};

export type AttachAbcMediaRequest = {
  objectKey: string;
  fileName?: string;
};

export type ListAbcCyclesQuery = {
  status?: AbcCycleStatus;
};
