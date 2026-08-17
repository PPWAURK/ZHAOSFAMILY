import { mobileApiClient } from "@/lib/api";
import { buildPublicStorePhotoUrl } from "@/lib/media";
import type {
  MobilePermissionUser,
  MobileStore,
  TrainingPositionOption,
} from "@/features/stores/storeTypes";

type ManageableRestaurantResponse = {
  id: number | string;
  storeCode: number | string;
  name?: string | null;
  address?: string | null;
  photoObjectKey?: string | null;
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

type TrainingPositionResponse = {
  code?: string;
  name?: Record<string, string>;
  isActive?: boolean;
  children?: TrainingPositionResponse[];
};

type InvitationResponse = {
  message: "INVITATION_SENT";
};

function formatStoreCode(storeCode: number | string): string {
  return `STORE ${String(storeCode).padStart(3, "0")}`;
}

function resolvePhotoUri(photoObjectKey?: string | null): string | null {
  return photoObjectKey ? buildPublicStorePhotoUrl(photoObjectKey) : null;
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
    photoObjectKey: restaurant.photoObjectKey || null,
    photoUri: resolvePhotoUri(restaurant.photoObjectKey),
    storeCode: formatStoreCode(restaurant.storeCode),
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
  const users = await mobileApiClient.get<PermissionUserResponse[]>("/permissions/users/approvals");

  return Array.isArray(users) ? users.map(mapPermissionUser) : [];
}

function mapTrainingPosition(
  position: TrainingPositionResponse,
): TrainingPositionOption | null {
  if (!position.code || !position.name) return null;

  return {
    code: position.code,
    name: position.name,
    isActive: position.isActive ?? false,
    children: (position.children || [])
      .map(mapTrainingPosition)
      .filter((child): child is TrainingPositionOption => child !== null),
  };
}

export async function fetchTrainingPositions(): Promise<TrainingPositionOption[]> {
  const positions = await mobileApiClient.get<TrainingPositionResponse[]>(
    "/training/positions",
  );

  return Array.isArray(positions)
    ? positions
        .map(mapTrainingPosition)
        .filter((position): position is TrainingPositionOption => position !== null)
    : [];
}

export async function sendEmployeeInvitation(input: {
  email: string;
  jobRole: string;
  language: "zh" | "en" | "fr";
}): Promise<InvitationResponse> {
  return mobileApiClient.post<InvitationResponse>("/permissions/invitations", input);
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
