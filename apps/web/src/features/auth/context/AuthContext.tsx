"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  apiClient,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "@/shared/api/api-client";

const ACCESS_TOKEN_STORAGE_KEY = "zhao_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "zhao_refresh_token";

function readStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  return {
    accessToken:
      sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ||
      localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY),
    refreshToken:
      sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) ||
      localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY),
  };
}

function persistSessionTokens(
  accessToken: string,
  refreshToken: string,
  rememberDevice: boolean,
): void {
  if (rememberDevice) {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

function clearStoredSessionTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

export type AuthUser = {
  id: number | string;
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
  role?: string | null;
  position?: string | null;
  jobRole?: string | null;
  storeName?: string | null;
  establishment?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
  permissions?: string[];
  store?: {
    id?: number | string;
    name?: string | null;
  } | null;
};

type AuthSessionResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type RegisterResponse = {
  message: "REGISTRATION_PENDING_APPROVAL";
  user: AuthUser;
};

type RegisterInput = {
  familyName: string;
  givenName: string;
  email: string;
  password: string;
  restaurantId: number;
  birthday?: string;
  jobRole?: string;
  profilePhotoDataUrl?: string;
  acceptedTerms: boolean;
  language: "zh" | "en" | "fr";
};

type UpdateMeInput = {
  phone?: string;
  address?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    options?: { rememberDevice?: boolean },
  ) => Promise<AuthUser>;
  register: (
    input: RegisterInput,
    options?: { rememberDevice?: boolean },
  ) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  updateMe: (input: UpdateMeInput) => Promise<AuthUser>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<void>;
  acceptInvitation: (
    token: string,
    name: string,
    password: string,
  ) => Promise<AuthUser>;
  forgotPassword: (
    email: string,
    language?: "zh" | "en" | "fr",
  ) => Promise<{ resetUrl?: string }>;
  resetPassword: (token: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const me = await apiClient.get<AuthUser>("/auth/me");
      setUser(me);
    } catch {
      setAccessToken(null);
      setRefreshToken(null);
      clearStoredSessionTokens();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const { accessToken, refreshToken } = readStoredTokens();

    if (!accessToken && !refreshToken) {
      setIsLoading(false);
      return;
    }

    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    loadMe().finally(() => setIsLoading(false));
  }, [loadMe]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      options: { rememberDevice?: boolean } = {},
    ) => {
      const data = await apiClient.post<AuthSessionResponse>("/auth/login", {
        email,
        password,
      });
      const rememberDevice = options.rememberDevice ?? true;

      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      persistSessionTokens(data.accessToken, data.refreshToken, rememberDevice);
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const data = await apiClient.post<RegisterResponse>("/auth/register", input);

      setAccessToken(null);
      setRefreshToken(null);
      clearStoredSessionTokens();
      setUser(null);
      return data;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout", {
        refreshToken: getRefreshToken() ?? undefined,
      });
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
      clearStoredSessionTokens();
      setUser(null);
    }
  }, []);

  const updateMe = useCallback(async (input: UpdateMeInput) => {
    const updatedUser = await apiClient.patch<AuthUser>("/auth/me", input);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, nextPassword: string) => {
      await apiClient.patch<void>("/auth/me/password", {
        currentPassword,
        nextPassword,
      });
    },
    [],
  );

  const acceptInvitation = useCallback(async (
    token: string,
    name: string,
    password: string,
  ) => {
    const data = await apiClient.post<AuthSessionResponse>("/auth/accept-invitation", {
      token,
      name,
      password,
    });

    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    persistSessionTokens(data.accessToken, data.refreshToken, true);
    setUser(data.user);
    return data.user;
  }, []);

  const forgotPassword = useCallback(async (email: string, language?: "zh" | "en" | "fr") => {
    return apiClient.post<{ resetUrl?: string }>("/auth/forgot-password", {
      email,
      language,
    });
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    await apiClient.post("/auth/reset-password", { token, password });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        updateMe,
        changePassword,
        acceptInvitation,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }

  return ctx;
}
