import type { AuthUser } from "./models";

export type LoginDto = {
  email: string;
  password: string;
};

export type LoginRequest = LoginDto;

export type RegisterDto = {
  familyName: string;
  givenName: string;
  email: string;
  password: string;
  restaurantId: number;
  birthday?: string;
  jobRole?: string;
  profilePhotoDataUrl?: string;
  level?: number;
  acceptedTerms: boolean;
  language: "zh" | "en" | "fr";
};

export type RegisterRequest = RegisterDto;

export type RegisterResponse = {
  message: "REGISTRATION_PENDING_APPROVAL";
  user: AuthUser;
};

export type RefreshSessionDto = {
  refreshToken: string;
};

export type RefreshSessionRequest = RefreshSessionDto;

export type LogoutDto = {
  refreshToken?: string;
};

export type LogoutRequest = LogoutDto;

export type AcceptInvitationDto = {
  token: string;
  name: string;
  password: string;
};

export type AcceptInvitationRequest = AcceptInvitationDto;

export type ForgotPasswordDto = {
  email: string;
  language?: "zh" | "en" | "fr";
};

export type ForgotPasswordRequest = ForgotPasswordDto;

export type ForgotPasswordResponse = {
  message: "PASSWORD_RESET_REQUESTED";
  resetUrl?: string;
};

export type ResetPasswordDto = {
  token: string;
  password: string;
};

export type ResetPasswordRequest = ResetPasswordDto;

export type UpdateMeDto = {
  phone?: string;
  address?: string;
};

export type UpdateMeRequest = UpdateMeDto;
