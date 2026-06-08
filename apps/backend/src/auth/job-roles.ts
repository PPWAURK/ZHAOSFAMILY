export const JOB_ROLE_VALUES = [
  'holding',
  'regional-manager',
  'store-manager',
  'front-manager',
  'back-manager',
  'front-assistant',
  'back-assistant',
  'front-of-house',
  'front-host',
  'front-cashier',
  'front-server',
  'front-packer',
  'front-bar',
  'back-of-house',
  'back-dishwasher',
  'back-noodle',
  'back-hot-appetizer',
  'back-cold-appetizer',
  'back-rice',
] as const;

export type JobRoleValue = (typeof JOB_ROLE_VALUES)[number];

export const JOB_ROLE_PATTERN = new RegExp(
  `^(${JOB_ROLE_VALUES.join('|')})(,(${JOB_ROLE_VALUES.join('|')}))*$`,
);
