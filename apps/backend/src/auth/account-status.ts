export const ACCOUNT_STATUS = {
  approved: 'approved',
  pending: 'pending',
  rejected: 'rejected',
} as const;

export const ACCOUNT_STATUS_VALUES = [
  ACCOUNT_STATUS.pending,
  ACCOUNT_STATUS.approved,
  ACCOUNT_STATUS.rejected,
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUS_VALUES)[number];
