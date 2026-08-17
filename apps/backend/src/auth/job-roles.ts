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

// Employee management also accepts active training-position codes (for
// example, a position created in the training position catalogue). The
// database-backed validation in PermissionsService verifies that such codes
// really exist before they are assigned.
export const JOB_ROLE_ASSIGNMENT_PATTERN =
  /^[A-Za-z0-9_-]{2,40}(,[A-Za-z0-9_-]{2,40})*$/;
