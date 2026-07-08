import { describe, expect, it, vi } from "vitest";

import { createAuthActions, type AuthActionDependencies } from "./actions";

type Mocked<T> = { [K in keyof T]: ReturnType<typeof vi.fn> };

const user = { id: 1, email: "a@b.co" } as never;
const session = { accessToken: "new-at", refreshToken: "new-rt", user };

function makeStore() {
  return {
    accessToken: null as string | null,
    refreshToken: null as string | null,
    error: null as string | null,
    status: "idle",
    user: null,
    clearSession: vi.fn(),
    setAccessToken: vi.fn(),
    setError: vi.fn(),
    setLoading: vi.fn(),
    setRefreshToken: vi.fn(),
    setSession: vi.fn(),
    setUser: vi.fn(),
  };
}

function makeDeps() {
  const storeState = makeStore();
  const authApi = {
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    getMe: vi.fn(),
    updateMe: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
    acceptInvitation: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  };
  const tokenStorage = {
    getAccessToken: vi.fn().mockResolvedValue(null),
    setAccessToken: vi.fn().mockResolvedValue(undefined),
    removeAccessToken: vi.fn().mockResolvedValue(undefined),
    getRefreshToken: vi.fn().mockResolvedValue(null),
    setRefreshToken: vi.fn().mockResolvedValue(undefined),
    removeRefreshToken: vi.fn().mockResolvedValue(undefined),
  };
  const syncAccessToken = vi.fn();
  const syncRefreshToken = vi.fn();

  const deps = {
    authApi,
    store: { getState: () => storeState },
    tokenStorage,
    syncAccessToken,
    syncRefreshToken,
  } as unknown as AuthActionDependencies;

  const actions = createAuthActions(deps);

  return {
    actions,
    storeState,
    authApi: authApi as Mocked<typeof authApi>,
    tokenStorage,
    syncAccessToken,
    syncRefreshToken,
  };
}

describe("login", () => {
  it("normalizes the email, persists tokens, and sets the session on success", async () => {
    const t = makeDeps();
    t.authApi.login.mockResolvedValue(session);

    await t.actions.login({ email: "  USER@Example.COM ", password: "pw" });

    expect(t.authApi.login).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "pw",
    });
    expect(t.tokenStorage.setAccessToken).toHaveBeenCalledWith("new-at");
    expect(t.tokenStorage.setRefreshToken).toHaveBeenCalledWith("new-rt");
    expect(t.syncAccessToken).toHaveBeenCalledWith("new-at");
    expect(t.storeState.setSession).toHaveBeenCalledWith(session);
    expect(t.storeState.setError).not.toHaveBeenCalled();
  });

  it("clears any stray token, records the error, and rethrows on failure", async () => {
    const t = makeDeps();
    const error = new Error("BAD_CREDENTIALS");
    t.authApi.login.mockRejectedValue(error);

    await expect(t.actions.login({ email: "user@example.com", password: "pw" })).rejects.toThrow(
      "BAD_CREDENTIALS",
    );

    expect(t.tokenStorage.removeAccessToken).toHaveBeenCalled();
    expect(t.syncAccessToken).toHaveBeenLastCalledWith(null);
    expect(t.syncRefreshToken).toHaveBeenLastCalledWith(null);
    expect(t.storeState.setError).toHaveBeenCalledWith("BAD_CREDENTIALS");
    expect(t.storeState.setSession).not.toHaveBeenCalled();
  });
});

describe("logout", () => {
  it("revokes the refresh token server-side, then clears all local state", async () => {
    const t = makeDeps();
    t.storeState.refreshToken = "stored-rt";

    await t.actions.logout();

    expect(t.authApi.logout).toHaveBeenCalledWith({ refreshToken: "stored-rt" });
    expect(t.tokenStorage.removeAccessToken).toHaveBeenCalled();
    expect(t.tokenStorage.removeRefreshToken).toHaveBeenCalled();
    expect(t.syncAccessToken).toHaveBeenCalledWith(null);
    expect(t.storeState.clearSession).toHaveBeenCalled();
  });

  // Documents CURRENT behavior: the finally block clears local state, but the
  // server error still propagates — so logout() rejects even though the user is
  // locally signed out. See note to product: decide if logout should instead
  // resolve silently (best-effort) so a network blip doesn't surface an error.
  it("clears local state on server-logout failure but still rethrows", async () => {
    const t = makeDeps();
    t.authApi.logout.mockRejectedValue(new Error("network"));

    await expect(t.actions.logout()).rejects.toThrow("network");

    expect(t.tokenStorage.removeAccessToken).toHaveBeenCalled();
    expect(t.storeState.clearSession).toHaveBeenCalled();
  });
});

describe("deleteAccount", () => {
  it("keeps the user signed in when the password is wrong (delete rejects)", async () => {
    const t = makeDeps();
    t.authApi.deleteAccount.mockRejectedValue(new Error("WRONG_PASSWORD"));

    await expect(t.actions.deleteAccount({ password: "wrong" })).rejects.toThrow("WRONG_PASSWORD");

    // Critical: a failed delete must NOT tear the session down.
    expect(t.tokenStorage.removeAccessToken).not.toHaveBeenCalled();
    expect(t.storeState.clearSession).not.toHaveBeenCalled();
  });

  it("tears the session down only after the account is actually deleted", async () => {
    const t = makeDeps();
    t.authApi.deleteAccount.mockResolvedValue({ success: true });

    await t.actions.deleteAccount({ password: "correct" });

    expect(t.tokenStorage.removeAccessToken).toHaveBeenCalled();
    expect(t.tokenStorage.removeRefreshToken).toHaveBeenCalled();
    expect(t.syncAccessToken).toHaveBeenCalledWith(null);
    expect(t.storeState.clearSession).toHaveBeenCalled();
  });
});

describe("restoreSession", () => {
  it("clears the session when no tokens are stored and never calls refresh", async () => {
    const t = makeDeps();

    await t.actions.restoreSession();

    expect(t.authApi.refresh).not.toHaveBeenCalled();
    expect(t.storeState.clearSession).toHaveBeenCalled();
  });

  it("refreshes and sets the session when a refresh token is stored", async () => {
    const t = makeDeps();
    t.tokenStorage.getRefreshToken.mockResolvedValue("stored-rt");
    t.authApi.refresh.mockResolvedValue(session);

    await t.actions.restoreSession();

    expect(t.authApi.refresh).toHaveBeenCalledWith({ refreshToken: "stored-rt" });
    expect(t.tokenStorage.setAccessToken).toHaveBeenCalledWith("new-at");
    expect(t.storeState.setSession).toHaveBeenCalledWith(session);
  });

  it("wipes stored tokens and clears the session when refresh fails", async () => {
    const t = makeDeps();
    t.tokenStorage.getRefreshToken.mockResolvedValue("stale-rt");
    t.authApi.refresh.mockRejectedValue(new Error("expired"));

    await t.actions.restoreSession();

    expect(t.tokenStorage.removeAccessToken).toHaveBeenCalled();
    expect(t.tokenStorage.removeRefreshToken).toHaveBeenCalled();
    expect(t.syncAccessToken).toHaveBeenLastCalledWith(null);
    expect(t.storeState.clearSession).toHaveBeenCalled();
    expect(t.storeState.setError).toHaveBeenCalled();
  });
});

describe("register", () => {
  it("does not auto-login: clears any session and returns the server response", async () => {
    const t = makeDeps();
    const response = { status: "pending" };
    t.authApi.register.mockResolvedValue(response);

    const result = await t.actions.register({
      email: "  NEW@Example.COM ",
      password: "pw",
    } as never);

    expect(t.authApi.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@example.com" }),
    );
    expect(t.storeState.clearSession).toHaveBeenCalled();
    expect(t.storeState.setSession).not.toHaveBeenCalled();
    expect(result).toBe(response);
  });
});
