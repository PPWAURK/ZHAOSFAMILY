import type { EntityId } from "../common";

export type UserRole =
  | "admin"
  | "owner"
  | "manager"
  | "staff"
  | "viewer"
  | (string & {});

export type AuthStoreRef = {
  id?: EntityId;
  name?: string | null;
};

export type AuthUser = {
  id: EntityId;
  email?: string | null;
  accountStatus?: "pending" | "approved" | "rejected" | (string & {});
  name?: string | null;
  firstName?: string | null;
  givenName?: string | null;
  lastName?: string | null;
  familyName?: string | null;
  surname?: string | null;
  phone?: string | null;
  address?: string | null;
  role?: UserRole | null;
  position?: string | null;
  jobRole?: string | null;
  storeName?: string | null;
  establishment?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
  permissions?: string[];
  store?: AuthStoreRef | null;
};

export type AuthSessionResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};
