import { apiClient } from "@/shared/api/api-client";

export async function fetchPermissionRoles() {
  const roles = await apiClient.get("/permissions/roles");

  return Array.isArray(roles) ? roles : [];
}

export async function fetchPermissionUsers() {
  const users = await apiClient.get("/permissions/users");

  return Array.isArray(users) ? users : [];
}

export async function updatePermissionUserRoles(id, roleNames) {
  return apiClient.patch(`/permissions/users/${encodeURIComponent(id)}/roles`, {
    roleNames,
  });
}
