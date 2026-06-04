export type PermissionRole = {
  name: string;
  description: string | null;
  permissions: string[];
};

export type PermissionUser = {
  id: number;
  email: string;
  name: string;
  accountStatus: string;
  restaurant?: {
    id: number;
    name: string;
  } | null;
  managedRestaurants: {
    id: number;
    name: string;
  }[];
  roles: string[];
  permissions: string[];
  jobRole?: string | null;
};

export type ManageableRestaurant = {
  id: number;
  name: string;
  address: string;
  photoUrl?: string | null;
};
