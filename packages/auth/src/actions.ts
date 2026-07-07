import type { AuthApi } from "@zhao/api";
import type {
  AcceptInvitationDto,
  ChangePasswordDto,
  DeleteAccountDto,
  LoginDto,
  RegisterDto,
  RegisterResponse,
  UpdateMeDto,
} from "@zhao/types";
import { normalizeEmail } from "@zhao/utils";
import type { TokenStorage } from "@zhao/auth/storage";
import type { AuthStore } from "@zhao/auth/store";

export type AuthActionDependencies = {
  authApi: AuthApi;
  store: {
    getState: () => AuthStore;
  };
  tokenStorage: TokenStorage;
  syncAccessToken: (token: string | null) => void;
  syncRefreshToken: (token: string | null) => void;
};

function resolveAuthErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function clearPersistedAccessToken(
  tokenStorage: TokenStorage,
  syncAccessToken: (token: string | null) => void,
  syncRefreshToken: (token: string | null) => void,
): Promise<void> {
  syncAccessToken(null);
  syncRefreshToken(null);

  try {
    await tokenStorage.removeAccessToken();
    await tokenStorage.removeRefreshToken();
  } catch {
    // Clearing in-memory auth state is still required even if secure storage fails.
  }
}

export function createAuthActions({
  authApi,
  store,
  tokenStorage,
  syncAccessToken,
  syncRefreshToken,
}: AuthActionDependencies) {
  async function restoreSession(): Promise<void> {
    const authStore = store.getState();
    authStore.setLoading();

    let storedToken: string | null = null;
    let storedRefreshToken: string | null = null;

    try {
      storedToken = await tokenStorage.getAccessToken();
      storedRefreshToken = await tokenStorage.getRefreshToken();
    } catch (error) {
      syncAccessToken(null);
      syncRefreshToken(null);
      authStore.clearSession();
      authStore.setError(
        resolveAuthErrorMessage(error, "Failed to read saved session"),
      );
      return;
    }

    if (!storedToken && !storedRefreshToken) {
      syncAccessToken(null);
      syncRefreshToken(null);
      authStore.clearSession();
      return;
    }

    syncAccessToken(storedToken);
    syncRefreshToken(storedRefreshToken);
    authStore.setAccessToken(storedToken);
    authStore.setRefreshToken(storedRefreshToken);

    try {
      if (storedRefreshToken) {
        const session = await authApi.refresh({
          refreshToken: storedRefreshToken,
        });
        await tokenStorage.setAccessToken(session.accessToken);
        await tokenStorage.setRefreshToken(session.refreshToken);
        syncAccessToken(session.accessToken);
        syncRefreshToken(session.refreshToken);
        authStore.setSession(session);
        return;
      }

      if (storedToken) {
        const user = await authApi.getMe();
        authStore.setUser(user);
      }
    } catch (error) {
      await tokenStorage.removeAccessToken();
      await tokenStorage.removeRefreshToken();
      syncAccessToken(null);
      syncRefreshToken(null);
      authStore.clearSession();
      authStore.setError(
        resolveAuthErrorMessage(error, "Failed to restore session"),
      );
    }
  }

  async function login(input: LoginDto): Promise<void> {
    const authStore = store.getState();
    authStore.setLoading();

    try {
      const session = await authApi.login({
        email: normalizeEmail(input.email),
        password: input.password,
      });

      await tokenStorage.setAccessToken(session.accessToken);
      await tokenStorage.setRefreshToken(session.refreshToken);
      syncAccessToken(session.accessToken);
      syncRefreshToken(session.refreshToken);
      authStore.setSession(session);
    } catch (error) {
      await clearPersistedAccessToken(
        tokenStorage,
        syncAccessToken,
        syncRefreshToken,
      );
      authStore.setError(resolveAuthErrorMessage(error, "Login failed"));
      throw error;
    }
  }

  async function register(input: RegisterDto): Promise<RegisterResponse> {
    const authStore = store.getState();
    authStore.setLoading();

    try {
      const response = await authApi.register({
        ...input,
        email: normalizeEmail(input.email),
      });

      await clearPersistedAccessToken(
        tokenStorage,
        syncAccessToken,
        syncRefreshToken,
      );
      authStore.clearSession();
      return response;
    } catch (error) {
      await clearPersistedAccessToken(
        tokenStorage,
        syncAccessToken,
        syncRefreshToken,
      );
      authStore.setError(resolveAuthErrorMessage(error, "Registration failed"));
      throw error;
    }
  }

  async function logout(): Promise<void> {
    const authStore = store.getState();

    try {
      await authApi.logout({
        refreshToken: authStore.refreshToken ?? undefined,
      });
    } finally {
      await tokenStorage.removeAccessToken();
      await tokenStorage.removeRefreshToken();
      syncAccessToken(null);
      syncRefreshToken(null);
      authStore.clearSession();
    }
  }

  async function acceptInvitation(input: AcceptInvitationDto): Promise<void> {
    const authStore = store.getState();
    authStore.setLoading();

    try {
      const session = await authApi.acceptInvitation(input);
      await tokenStorage.setAccessToken(session.accessToken);
      await tokenStorage.setRefreshToken(session.refreshToken);
      syncAccessToken(session.accessToken);
      syncRefreshToken(session.refreshToken);
      authStore.setSession(session);
    } catch (error) {
      await clearPersistedAccessToken(
        tokenStorage,
        syncAccessToken,
        syncRefreshToken,
      );
      authStore.setError(
        resolveAuthErrorMessage(error, "Failed to accept invitation"),
      );
      throw error;
    }
  }

  async function updateMe(input: UpdateMeDto): Promise<void> {
    const authStore = store.getState();

    const user = await authApi.updateMe(input);
    authStore.setUser(user);
  }

  async function changePassword(input: ChangePasswordDto): Promise<void> {
    await authApi.changePassword(input);
  }

  async function deleteAccount(input: DeleteAccountDto): Promise<void> {
    const authStore = store.getState();

    // Only tear the session down once the account is actually deleted — a wrong
    // password must leave the user signed in so they can retry.
    await authApi.deleteAccount(input);

    await tokenStorage.removeAccessToken();
    await tokenStorage.removeRefreshToken();
    syncAccessToken(null);
    syncRefreshToken(null);
    authStore.clearSession();
  }

  return {
    acceptInvitation,
    changePassword,
    deleteAccount,
    login,
    logout,
    register,
    restoreSession,
    updateMe,
  };
}
