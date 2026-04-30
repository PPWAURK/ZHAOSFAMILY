import { apiClient } from "@/shared/api/api-client";

export async function registerUser(payload) {
  return apiClient.post("/auth/register", payload);
}
