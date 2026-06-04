import { apiClient } from "@/shared/api/api-client";
import type { AuthSessionResponse, RegisterRequest } from "@zhao/types";

export type RegisterUserPayload = RegisterRequest;

export async function registerUser<TResponse = AuthSessionResponse>(
  payload: RegisterUserPayload,
): Promise<TResponse> {
  return apiClient.post<TResponse>("/auth/register", payload);
}
