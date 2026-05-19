import { Matches } from 'class-validator';

const JOB_ROLE_VALUES = [
  'front-of-house',
  'back-of-house',
  'cash',
  'all-rounder',
  'store-manager',
  'regional-manager',
  'holding',
] as const;
const JOB_ROLE_PATTERN = new RegExp(
  `^(${JOB_ROLE_VALUES.join('|')})(,(${JOB_ROLE_VALUES.join('|')}))*$`,
);

export class UpdateUserJobRoleDto {
  @Matches(JOB_ROLE_PATTERN, { message: 'INVALID_JOB_ROLE' })
  jobRole!: string;
}
