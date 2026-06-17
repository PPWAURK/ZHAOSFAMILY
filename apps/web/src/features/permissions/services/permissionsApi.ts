import { apiClient } from "@/shared/api/api-client";
import type {
  ManageableRestaurant,
  PermissionRole,
  PermissionUser,
} from "@/features/permissions/types/permission";

export async function fetchPermissionRoles(): Promise<PermissionRole[]> {
  const roles = await apiClient.get<PermissionRole[]>("/permissions/roles");

  return Array.isArray(roles) ? roles : [];
}

export async function fetchPermissionUsers(): Promise<PermissionUser[]> {
  const users = await apiClient.get<PermissionUser[]>("/permissions/users");

  return Array.isArray(users) ? users : [];
}

export async function fetchApprovablePermissionUsers(): Promise<PermissionUser[]> {
  const users = await apiClient.get<PermissionUser[]>("/permissions/users/approvals");

  return Array.isArray(users) ? users : [];
}

export async function fetchManageableRestaurants(): Promise<ManageableRestaurant[]> {
  const restaurants = await apiClient.get<ManageableRestaurant[]>(
    "/permissions/restaurants/manageable",
  );

  return Array.isArray(restaurants) ? restaurants : [];
}

export async function updatePermissionUserRoles(
  id: number | string,
  roleNames: string[],
): Promise<PermissionUser> {
  return apiClient.patch<PermissionUser>(
    `/permissions/users/${encodeURIComponent(id)}/roles`,
    {
      roleNames,
    },
  );
}

export async function updatePermissionUserManagedRestaurants(
  id: number | string,
  restaurantIds: number[],
): Promise<PermissionUser> {
  return apiClient.patch<PermissionUser>(
    `/permissions/users/${encodeURIComponent(id)}/managed-restaurants`,
    {
      restaurantIds,
    },
  );
}

export async function updatePermissionUserJobRole(
  id: number | string,
  jobRole: string,
): Promise<PermissionUser> {
  return apiClient.patch<PermissionUser>(
    `/permissions/users/${encodeURIComponent(id)}/job-role`,
    {
      jobRole,
    },
  );
}

export async function removePermissionUser(
  id: number | string,
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(
    `/permissions/users/${encodeURIComponent(id)}`,
  );
}

export async function updatePermissionUserApproval(
  id: number | string,
  accountStatus: "approved" | "rejected",
  options: {
    restaurantId?: number;
    jobRole?: string;
  } = {},
): Promise<PermissionUser> {
  return apiClient.patch<PermissionUser>(
    `/permissions/users/${encodeURIComponent(id)}/approval`,
    {
      accountStatus,
      ...options,
    },
  );
}
