import type {
  AcceptInvitationRequest,
  AuthSessionResponse,
  AuthUser,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LogoutRequest,
  RefreshSessionRequest,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  UpdateMeRequest,
} from "@zhao/types";
import type { ApiClient } from "../client";

export type AuthApi = {
  login: (input: LoginRequest) => Promise<AuthSessionResponse>;
  register: (input: RegisterRequest) => Promise<RegisterResponse>;
  refresh: (input: RefreshSessionRequest) => Promise<AuthSessionResponse>;
  logout: (input?: LogoutRequest) => Promise<void>;
  getMe: () => Promise<AuthUser>;
  updateMe: (input: UpdateMeRequest) => Promise<AuthUser>;
  acceptInvitation: (input: AcceptInvitationRequest) => Promise<AuthSessionResponse>;
  forgotPassword: (input: ForgotPasswordRequest) => Promise<ForgotPasswordResponse>;
  resetPassword: (input: ResetPasswordRequest) => Promise<void>;
};

export function createAuthApi(apiClient: ApiClient): AuthApi {
  return {
    login: (input) => apiClient.post<AuthSessionResponse>("/auth/login", input),
    register: (input) => apiClient.post<RegisterResponse>("/auth/register", input),
    refresh: (input) => apiClient.post<AuthSessionResponse>("/auth/refresh", input),
    logout: (input = {}) => apiClient.post<void>("/auth/logout", input),
    getMe: () => apiClient.get<AuthUser>("/auth/me"),
    updateMe: (input) => apiClient.patch<AuthUser>("/auth/me", input),
    acceptInvitation: (input) =>
      apiClient.post<AuthSessionResponse>("/auth/accept-invitation", input),
    forgotPassword: (input) =>
      apiClient.post<ForgotPasswordResponse>("/auth/forgot-password", input),
    resetPassword: (input) => apiClient.post<void>("/auth/reset-password", input),
  };
}
