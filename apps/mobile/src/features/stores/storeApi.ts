import { MOBILE_API_URL } from "@/lib/env";
import { mobileApiClient } from "@/lib/api";
import type {
  MobilePermissionUser,
  MobileStore,
} from "@/features/stores/storeTypes";

type ManageableRestaurantResponse = {
  id: number | string;
  name?: string | null;
  address?: string | null;
  photoUrl?: string | null;
};

type PermissionUserResponse = {
  id: number | string;
  email?: string | null;
  name?: string | null;
  accountStatus?: string | null;
  jobRole?: string | null;
  restaurant?: {
    id: number | string;
    name?: string | null;
  } | null;
};

function formatStoreCode(restaurantId: number | string): string {
  return `STORE ${String(restaurantId).padStart(3, "0")}`;
}

function resolveApiOrigin(): string {
  try {
    return new URL(MOBILE_API_URL).origin;
  } catch {
    return "";
  }
}

function resolvePhotoUri(photoUrl?: string | null): string | null {
  if (!photoUrl) return null;
  if (/^(https?:)?\/\//i.test(photoUrl) || photoUrl.startsWith("data:")) {
    return photoUrl;
  }

  const apiOrigin = resolveApiOrigin();
  if (!apiOrigin) return photoUrl;
  if (photoUrl.startsWith("/")) return `${apiOrigin}${photoUrl}`;

  return `${apiOrigin}/${photoUrl.replace(/^\/+/, "")}`;
}

function toNumberId(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

function mapRestaurant(restaurant: ManageableRestaurantResponse): MobileStore {
  const id = toNumberId(restaurant.id);

  return {
    id,
    name: restaurant.name || "",
    address: restaurant.address || "",
    photoUrl: restaurant.photoUrl || null,
    photoUri: resolvePhotoUri(restaurant.photoUrl),
    storeCode: formatStoreCode(id),
  };
}

function mapPermissionUser(user: PermissionUserResponse): MobilePermissionUser {
  return {
    id: toNumberId(user.id),
    email: user.email || null,
    name: user.name || null,
    accountStatus: user.accountStatus || null,
    jobRole: user.jobRole || null,
    restaurant: user.restaurant
      ? {
          id: toNumberId(user.restaurant.id),
          name: user.restaurant.name || null,
        }
      : null,
  };
}

export async function fetchManageableStores(): Promise<MobileStore[]> {
  const restaurants = await mobileApiClient.get<ManageableRestaurantResponse[]>(
    "/permissions/restaurants/manageable",
  );

  return Array.isArray(restaurants) ? restaurants.map(mapRestaurant) : [];
}

export async function fetchApprovableUsers(): Promise<MobilePermissionUser[]> {
  const users = await mobileApiClient.get<PermissionUserResponse[]>(
    "/permissions/users/approvals",
  );

  return Array.isArray(users) ? users.map(mapPermissionUser) : [];
}

export async function updateUserApproval(
  userId: number,
  accountStatus: "approved" | "rejected",
  options: {
    jobRole?: string;
    restaurantId?: number;
  } = {},
): Promise<MobilePermissionUser> {
  const user = await mobileApiClient.patch<PermissionUserResponse>(
    `/permissions/users/${encodeURIComponent(userId)}/approval`,
    {
      accountStatus,
      ...options,
    },
  );

  return mapPermissionUser(user);
}

export async function updateUserJobRole(
  userId: number,
  jobRole: string,
): Promise<MobilePermissionUser> {
  const user = await mobileApiClient.patch<PermissionUserResponse>(
    `/permissions/users/${encodeURIComponent(userId)}/job-role`,
    {
      jobRole,
    },
  );

  return mapPermissionUser(user);
}
