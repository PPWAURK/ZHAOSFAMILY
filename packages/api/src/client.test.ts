import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock axios so no real network happens. `request` is the per-call transport,
// `post` is used only by the refresh flow, and `interceptors.request.use`
// captures the auth-header interceptor for direct assertion.
const h = vi.hoisted(() => {
  const requestMock = vi.fn();
  const postMock = vi.fn();
  const useMock = vi.fn();
  return {
    requestMock,
    postMock,
    useMock,
    instance: {
      request: requestMock,
      post: postMock,
      interceptors: { request: { use: useMock } },
    },
  };
});

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => h.instance),
    isAxiosError: (error: unknown) =>
      Boolean(error && (error as { isAxiosError?: boolean }).isAxiosError),
  },
  AxiosError: class AxiosError extends Error {},
}));

import { ApiClientError, createApiClient } from "./client";

function axiosError(status: number, config: Record<string, unknown> = {}) {
  return { isAxiosError: true, response: { status, data: null }, config };
}

function makeClient(overrides: Record<string, unknown> = {}) {
  const tokens = { access: "at" as string | null, refresh: "rt" as string | null };
  const setAccessToken = vi.fn((t: string | null) => {
    tokens.access = t;
  });
  const setRefreshToken = vi.fn((t: string | null) => {
    tokens.refresh = t;
  });
  const client = createApiClient({
    baseURL: "http://test",
    getAccessToken: () => tokens.access,
    setAccessToken,
    getRefreshToken: () => tokens.refresh,
    setRefreshToken,
    ...overrides,
  });
  return { client, tokens, setAccessToken, setRefreshToken };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("request", () => {
  it("returns response.data on success", async () => {
    h.requestMock.mockResolvedValue({ data: { ok: true } });
    const { client } = makeClient();

    await expect(client.get("/thing")).resolves.toEqual({ ok: true });
  });

  it("attaches the Bearer access token via the request interceptor", () => {
    makeClient();
    const interceptor = h.useMock.mock.calls[0][0] as (c: { headers: Record<string, string> }) => {
      headers: Record<string, string>;
    };

    const config = interceptor({ headers: {} });

    expect(config.headers.Authorization).toBe("Bearer at");
  });
});

describe("401 refresh flow", () => {
  it("refreshes once, then replays the original request and returns its data", async () => {
    h.requestMock.mockImplementation((config: { retried?: boolean; url?: string }) =>
      config.retried
        ? Promise.resolve({ data: { replayed: true } })
        : Promise.reject(axiosError(401, config)),
    );
    h.postMock.mockResolvedValue({
      data: { accessToken: "new-at", refreshToken: "new-rt" },
    });
    const { client, setAccessToken, setRefreshToken } = makeClient();

    await expect(client.get("/thing")).resolves.toEqual({ replayed: true });

    expect(h.postMock).toHaveBeenCalledTimes(1);
    expect(h.postMock).toHaveBeenCalledWith("/auth/refresh", {
      refreshToken: "rt",
    });
    expect(setAccessToken).toHaveBeenCalledWith("new-at");
    expect(setRefreshToken).toHaveBeenCalledWith("new-rt");
  });

  it("does not retry and clears the access token when no refresh token exists", async () => {
    h.requestMock.mockRejectedValue(axiosError(401, { url: "/thing" }));
    const { client, setAccessToken } = makeClient({ getRefreshToken: () => null });

    await expect(client.get("/thing")).rejects.toBeInstanceOf(ApiClientError);

    expect(h.postMock).not.toHaveBeenCalled();
    expect(setAccessToken).toHaveBeenCalledWith(null);
    expect(h.requestMock).toHaveBeenCalledTimes(1);
  });

  it("clears both tokens and surfaces the error when refresh itself fails", async () => {
    h.requestMock.mockRejectedValue(axiosError(401, { url: "/thing" }));
    h.postMock.mockRejectedValue(axiosError(401, { url: "/auth/refresh" }));
    const { client, setAccessToken, setRefreshToken } = makeClient();

    await expect(client.get("/thing")).rejects.toBeInstanceOf(ApiClientError);

    expect(setAccessToken).toHaveBeenLastCalledWith(null);
    expect(setRefreshToken).toHaveBeenLastCalledWith(null);
  });

  it("dedupes concurrent 401s into a single refresh (in-flight guard)", async () => {
    h.requestMock.mockImplementation((config: { retried?: boolean }) =>
      config.retried
        ? Promise.resolve({ data: { ok: true } })
        : Promise.reject(axiosError(401, config)),
    );
    h.postMock.mockResolvedValue({
      data: { accessToken: "new-at", refreshToken: "new-rt" },
    });
    const { client } = makeClient();

    const results = await Promise.all([client.get("/a"), client.get("/b"), client.get("/c")]);

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    // Three simultaneous 401s must trigger exactly one refresh call.
    expect(h.postMock).toHaveBeenCalledTimes(1);
  });

  it("never tries to refresh a 401 from the refresh endpoint itself", async () => {
    h.requestMock.mockRejectedValue(axiosError(401, { url: "/auth/refresh" }));
    const { client } = makeClient();

    await expect(client.post("/auth/refresh", { refreshToken: "rt" })).rejects.toBeInstanceOf(
      ApiClientError,
    );

    expect(h.postMock).not.toHaveBeenCalled();
  });

  it("never tries to refresh a 401 from the login endpoint", async () => {
    h.requestMock.mockRejectedValue(axiosError(401, { url: "/auth/login" }));
    const { client } = makeClient();

    await expect(
      client.post("/auth/login", { email: "a@b.co", password: "x" }),
    ).rejects.toBeInstanceOf(ApiClientError);

    expect(h.postMock).not.toHaveBeenCalled();
  });
});
