export const ACCOUNT_STATUS = {
  approved: 'approved',
  pending: 'pending',
  rejected: 'rejected',
  removed: 'removed',
} as const;

export const ACCOUNT_STATUS_VALUES = [
  ACCOUNT_STATUS.pending,
  ACCOUNT_STATUS.approved,
  ACCOUNT_STATUS.rejected,
  ACCOUNT_STATUS.removed,
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUS_VALUES)[number];
