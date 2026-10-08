import type { AuthApi } from "@zhao/api";
import type {
  AuthUser,
  AcceptInvitationDto,
  ChangePasswordDto,
  DeleteAccountDto,
  LoginDto,
  RegisterDto,
  RegisterResponse,
  UpdateMeDto,
} from "@zhao/types";
import { normalizeEmail } from "@zhao/utils";
import type { AuthUserSnapshotStorage, TokenStorage } from "@zhao/auth/storage";
import type { AuthStore } from "@zhao/auth/store";

export type AuthActionDependencies = {
  authApi: AuthApi;
  store: {
    getState: () => AuthStore;
  };
  tokenStorage: TokenStorage;
  userSnapshotStorage?: AuthUserSnapshotStorage;
  onUserSnapshotStorageError?: (operation: "read" | "write" | "clear", error: unknown) => void;
  onTokenStorageClearError?: (error: unknown) => void;
  syncAccessToken: (token: string | null) => void;
  syncRefreshToken: (token: string | null) => void;
};

function resolveAuthErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function resolveHttpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  return typeof error.status === "number" ? error.status : undefined;
}

function isSessionRejected(error: unknown): boolean {
  const status = resolveHttpStatus(error);
  return status === 401 || status === 403;
}

async function clearPersistedAccessToken(
  tokenStorage: TokenStorage,
  syncAccessToken: (token: string | null) => void,
  syncRefreshToken: (token: string | null) => void,
  userSnapshotStorage?: AuthUserSnapshotStorage,
  onUserSnapshotStorageError?: AuthActionDependencies["onUserSnapshotStorageError"],
  onTokenStorageClearError?: AuthActionDependencies["onTokenStorageClearError"],
): Promise<void> {
  syncAccessToken(null);
  syncRefreshToken(null);

  const tokenClearResults = await Promise.allSettled([
    tokenStorage.removeAccessToken(),
    tokenStorage.removeRefreshToken(),
  ]);
  for (const result of tokenClearResults) {
    if (result.status === "rejected") {
      if (onTokenStorageClearError) {
        onTokenStorageClearError(result.reason);
      } else {
        console.warn("Unable to clear persisted session credentials.", result.reason);
      }
    }
  }

  if (!userSnapshotStorage) return;

  try {
    await userSnapshotStorage.clear();
  } catch (error) {
    if (onUserSnapshotStorageError) {
      onUserSnapshotStorageError("clear", error);
    } else {
      console.warn("Unable to clear the local user snapshot.", error);
    }
  }
}

export function createAuthActions({
  authApi,
  store,
  tokenStorage,
  userSnapshotStorage,
  onUserSnapshotStorageError,
  onTokenStorageClearError,
  syncAccessToken,
  syncRefreshToken,
}: AuthActionDependencies) {
  let sessionValidationInFlight: Promise<void> | null = null;

  async function readUserSnapshot(): Promise<AuthUser | null> {
    if (!userSnapshotStorage) return null;

    try {
      return await userSnapshotStorage.read();
    } catch (error) {
      reportUserSnapshotStorageError("read", error);
      return null;
    }
  }

  async function writeUserSnapshot(user: AuthUser): Promise<void> {
    if (!userSnapshotStorage) return;

    try {
      await userSnapshotStorage.write(user);
    } catch (error) {
      reportUserSnapshotStorageError("write", error);
    }
  }

  async function clearUserSnapshot(): Promise<void> {
    if (!userSnapshotStorage) return;

    try {
      await userSnapshotStorage.clear();
    } catch (error) {
      reportUserSnapshotStorageError("clear", error);
    }
  }

  function reportUserSnapshotStorageError(
    operation: "read" | "write" | "clear",
    error: unknown,
  ): void {
    if (onUserSnapshotStorageError) {
      onUserSnapshotStorageError(operation, error);
      return;
    }

    console.warn(`Unable to ${operation} the local user snapshot.`, error);
  }

  async function rejectSession(error: unknown): Promise<void> {
    await clearPersistedAccessToken(
      tokenStorage,
      syncAccessToken,
      syncRefreshToken,
      userSnapshotStorage,
      onUserSnapshotStorageError,
      onTokenStorageClearError,
    );
    const authStore = store.getState();
    authStore.clearSession();
    authStore.setError(resolveAuthErrorMessage(error, "Failed to restore session"));
  }

  function markSessionOffline(): void {
    const authStore = store.getState();
    if (authStore.user) authStore.setOfflineUser(authStore.user);
  }

  async function validateStoredSession(fallbackUser: AuthUser | null): Promise<void> {
    const authStore = store.getState();
    const currentRefreshToken = authStore.refreshToken;
    const currentAccessToken = authStore.accessToken;

    if (!currentRefreshToken && !currentAccessToken) {
      authStore.clearSession();
      await clearUserSnapshot();
      return;
    }

    try {
      if (currentRefreshToken) {
        const session = await authApi.refresh({ refreshToken: currentRefreshToken });
        await tokenStorage.setAccessToken(session.accessToken);
        await tokenStorage.setRefreshToken(session.refreshToken);
        syncAccessToken(session.accessToken);
        syncRefreshToken(session.refreshToken);
        authStore.setSession(session);
        await writeUserSnapshot(session.user);
        return;
      }

      const user = await authApi.getMe();
      authStore.setUser(user);
      await writeUserSnapshot(user);
    } catch (error) {
      if (isSessionRejected(error)) {
        await rejectSession(error);
        return;
      }

      const cachedUser = fallbackUser ?? authStore.user;
      if (cachedUser) {
        authStore.setOfflineUser(cachedUser);
        return;
      }

      authStore.setUser(null);
      authStore.setError(resolveAuthErrorMessage(error, "Failed to restore session"));
    }
  }

  function validateStoredSessionOnce(fallbackUser: AuthUser | null): Promise<void> {
    if (sessionValidationInFlight) return sessionValidationInFlight;

    const validation = validateStoredSession(fallbackUser);
    sessionValidationInFlight = validation.finally(() => {
      sessionValidationInFlight = null;
    });

    return sessionValidationInFlight;
  }

  async function restoreSession(): Promise<void> {
    const authStore = store.getState();
    authStore.setLoading();

    let storedToken: string | null;
    let storedRefreshToken: string | null;
    let cachedUser: AuthUser | null;

    try {
      const [credentials, userSnapshot] = await Promise.all([
        Promise.all([tokenStorage.getAccessToken(), tokenStorage.getRefreshToken()]),
        readUserSnapshot(),
      ]);
      [storedToken, storedRefreshToken] = credentials;
      cachedUser = userSnapshot;
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
      await clearUserSnapshot();
      return;
    }

    syncAccessToken(storedToken);
    syncRefreshToken(storedRefreshToken);
    authStore.setAccessToken(storedToken);
    authStore.setRefreshToken(storedRefreshToken);

    if (cachedUser) authStore.setOfflineUser(cachedUser);
    await validateStoredSessionOnce(cachedUser);
  }

  async function revalidateSession(): Promise<void> {
    const authStore = store.getState();
    if (
      authStore.status !== "offline" ||
      (!authStore.accessToken && !authStore.refreshToken)
    ) {
      return;
    }

    await validateStoredSessionOnce(authStore.user);
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
      await writeUserSnapshot(session.user);
    } catch (error) {
      await clearPersistedAccessToken(
        tokenStorage,
        syncAccessToken,
        syncRefreshToken,
        userSnapshotStorage,
        onUserSnapshotStorageError,
        onTokenStorageClearError,
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
        userSnapshotStorage,
        onUserSnapshotStorageError,
        onTokenStorageClearError,
      );
      authStore.clearSession();
      return response;
    } catch (error) {
      await clearPersistedAccessToken(
        tokenStorage,
        syncAccessToken,
        syncRefreshToken,
        userSnapshotStorage,
        onUserSnapshotStorageError,
        onTokenStorageClearError,
      );
      authStore.setError(resolveAuthErrorMessage(error, "Registration failed"));
      throw error;
    }
  }

  async function logout(): Promise<void> {
    const authStore = store.getState();

    try {
      if (authStore.status !== "offline") {
        await authApi.logout({
          refreshToken: authStore.refreshToken ?? undefined,
        });
      }
    } finally {
      await clearPersistedAccessToken(
        tokenStorage,
        syncAccessToken,
        syncRefreshToken,
        userSnapshotStorage,
        onUserSnapshotStorageError,
        onTokenStorageClearError,
      );
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
      await writeUserSnapshot(session.user);
    } catch (error) {
      await clearPersistedAccessToken(
        tokenStorage,
        syncAccessToken,
        syncRefreshToken,
        userSnapshotStorage,
        onUserSnapshotStorageError,
        onTokenStorageClearError,
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
    await writeUserSnapshot(user);
  }

  async function changePassword(input: ChangePasswordDto): Promise<void> {
    await authApi.changePassword(input);
  }

  async function deleteAccount(input: DeleteAccountDto): Promise<void> {
    const authStore = store.getState();

    // Only tear the session down once the account is actually deleted — a wrong
    // password must leave the user signed in so they can retry.
    await authApi.deleteAccount(input);

    await clearPersistedAccessToken(
      tokenStorage,
      syncAccessToken,
      syncRefreshToken,
      userSnapshotStorage,
      onUserSnapshotStorageError,
      onTokenStorageClearError,
    );
    authStore.clearSession();
  }

  return {
    acceptInvitation,
    changePassword,
    deleteAccount,
    login,
    markSessionOffline,
    logout,
    register,
    rejectSession,
    revalidateSession,
    restoreSession,
    updateMe,
  };
}
