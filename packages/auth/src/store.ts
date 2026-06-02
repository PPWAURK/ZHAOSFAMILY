import { createStore } from "zustand/vanilla";
import type { AuthUser } from "@zhao/types";

export type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

export type AuthState = {
  accessToken: string | null;
  error: string | null;
  refreshToken: string | null;
  status: AuthStatus;
  user: AuthUser | null;
};

export type AuthActions = {
  clearSession: () => void;
  setAccessToken: (accessToken: string | null) => void;
  setError: (error: string | null) => void;
  setLoading: () => void;
  setRefreshToken: (refreshToken: string | null) => void;
  setSession: (session: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  }) => void;
  setUser: (user: AuthUser | null) => void;
};

export type AuthStore = AuthState & AuthActions;

export const initialAuthState: AuthState = {
  accessToken: null,
  error: null,
  refreshToken: null,
  status: "idle",
  user: null,
};

export function createAuthStore(initialState: Partial<AuthState> = {}) {
  return createStore<AuthStore>((set) => ({
    ...initialAuthState,
    ...initialState,
    clearSession: () =>
      set({
        accessToken: null,
        error: null,
        refreshToken: null,
        status: "anonymous",
        user: null,
      }),
    setAccessToken: (accessToken) => set({ accessToken }),
    setError: (error) => set({ error, status: "anonymous" }),
    setLoading: () => set({ error: null, status: "loading" }),
    setRefreshToken: (refreshToken) => set({ refreshToken }),
    setSession: ({ accessToken, refreshToken, user }) =>
      set({
        accessToken,
        error: null,
        refreshToken,
        status: "authenticated",
        user,
      }),
    setUser: (user) =>
      set({
        status: user ? "authenticated" : "anonymous",
        user,
      }),
  }));
}
