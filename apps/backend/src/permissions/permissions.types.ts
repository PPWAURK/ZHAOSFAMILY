export const BUILT_IN_ROLE_NAMES = [
  'super-admin',
  'store-manager',
  'training-admin',
  'training-viewer',
] as const;

export type BuiltInRoleName = (typeof BUILT_IN_ROLE_NAMES)[number];

export type PermissionRoleItem = {
  name: string;
  description: string | null;
  permissions: string[];
};

export type PermissionUserItem = {
  id: number;
  name: string;
  email: string;
  restaurant: {
    id: number;
    name: string;
  };
  jobRole: string | null;
  roles: string[];
  permissions: string[];
};
