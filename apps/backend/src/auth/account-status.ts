export const ACCOUNT_STATUS = {
  approved: 'approved',
  pending: 'pending',
  rejected: 'rejected',
  removed: 'removed',
  deleted: 'deleted',
} as const;

export const ACCOUNT_STATUS_VALUES = [
  ACCOUNT_STATUS.pending,
  ACCOUNT_STATUS.approved,
  ACCOUNT_STATUS.rejected,
  ACCOUNT_STATUS.removed,
  ACCOUNT_STATUS.deleted,
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUS_VALUES)[number];
