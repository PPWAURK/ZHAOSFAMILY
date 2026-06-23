import type { AbcCycleStatus, AbcGrade } from "./models";

export type CreateAbcCycleRequest = {
  label: string;
};

export type FillAbcScoreRequest = {
  score: number;
  notes?: string;
};

// 运营部填稽核分时一并手动给出 A/B/C 评级（评级可选）。
export type FillAbcOperationsRequest = {
  score: number;
  notes?: string;
  grade?: AbcGrade;
};

export type AttachAbcMediaRequest = {
  objectKey: string;
  fileName?: string;
};

export type ListAbcCyclesQuery = {
  status?: AbcCycleStatus;
};
