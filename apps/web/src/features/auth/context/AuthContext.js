"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiClient, setAccessToken } from "@/shared/api/api-client";

const AuthContext = createContext(null);
const ACCESS_TOKEN_STORAGE_KEY = "zhao_access_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const me = await apiClient.get("/auth/me");
      setUser(me);
    } catch {
      setAccessToken(null);
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

    if (!storedAccessToken) {
      setIsLoading(false);
      return;
    }

    setAccessToken(storedAccessToken);
    loadMe().finally(() => setIsLoading(false));
  }, [loadMe]);

  const login = useCallback(async (email, password) => {
    const data = await apiClient.post("/auth/login", { email, password });
    setAccessToken(data.accessToken);
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      setAccessToken(null);
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      setUser(null);
    }
  }, []);

  const updateMe = useCallback(async (input) => {
    const updatedUser = await apiClient.patch("/auth/me", input);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const acceptInvitation = useCallback(async (token, name, password) => {
    const data = await apiClient.post("/auth/accept-invitation", {
      token,
      name,
      password,
    });

    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const forgotPassword = useCallback(async (email) => {
    await apiClient.post("/auth/forgot-password", { email });
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    await apiClient.post("/auth/reset-password", { token, password });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        updateMe,
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
