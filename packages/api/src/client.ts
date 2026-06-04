import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { ApiClientError, toApiClientError } from "./errors";

export type AccessTokenReader = () => string | null;
export type AccessTokenWriter = (token: string | null) => void;
export type RefreshTokenReader = () => string | null;
export type RefreshTokenWriter = (token: string | null) => void;

export type CreateApiClientOptions = {
  baseURL: string;
  getAccessToken?: AccessTokenReader;
  setAccessToken?: AccessTokenWriter;
  getRefreshToken?: RefreshTokenReader;
  setRefreshToken?: RefreshTokenWriter;
  refreshPath?: string;
};

export type RequestBody = Record<string, unknown> | unknown[] | string | number | boolean | null;

export type ApiClient = {
  axios: AxiosInstance;
  get: <TResponse = unknown>(path: string, config?: AxiosRequestConfig) => Promise<TResponse>;
  post: <TResponse = unknown>(
    path: string,
    body?: RequestBody,
    config?: AxiosRequestConfig,
  ) => Promise<TResponse>;
  patch: <TResponse = unknown>(
    path: string,
    body?: RequestBody,
    config?: AxiosRequestConfig,
  ) => Promise<TResponse>;
  put: <TResponse = unknown>(
    path: string,
    body?: RequestBody,
    config?: AxiosRequestConfig,
  ) => Promise<TResponse>;
  delete: <TResponse = unknown>(path: string, config?: AxiosRequestConfig) => Promise<TResponse>;
  upload: <TResponse = unknown>(path: string, formData: FormData) => Promise<TResponse>;
  refresh: () => Promise<string | null>;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setRefreshToken(token: string | null): void {
  refreshToken = token;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

function attachAccessToken(
  config: InternalAxiosRequestConfig,
  readAccessToken: AccessTokenReader,
): InternalAxiosRequestConfig {
  const token = readAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

export function createApiClient({
  baseURL,
  getAccessToken: readAccessToken = getAccessToken,
  setAccessToken: writeAccessToken = setAccessToken,
  getRefreshToken: readRefreshToken = getRefreshToken,
  setRefreshToken: writeRefreshToken = setRefreshToken,
  refreshPath = "/auth/refresh",
}: CreateApiClientOptions): ApiClient {
  const axiosInstance = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  });

  let refreshInFlight: Promise<string | null> | null = null;

  axiosInstance.interceptors.request.use((config) => attachAccessToken(config, readAccessToken));

  async function refreshAccessToken(): Promise<string | null> {
    const currentRefreshToken = readRefreshToken();

    if (!currentRefreshToken) {
      writeAccessToken(null);
      return null;
    }

    if (refreshInFlight) {
      return refreshInFlight;
    }

    refreshInFlight = axiosInstance
      .post<{ accessToken?: string; refreshToken?: string }>(refreshPath, {
        refreshToken: currentRefreshToken,
      })
      .then((response) => {
        const nextToken = response.data.accessToken ?? null;
        const nextRefreshToken = response.data.refreshToken ?? null;
        writeAccessToken(nextToken);
        writeRefreshToken(nextRefreshToken);
        return nextToken;
      })
      .catch(() => {
        writeAccessToken(null);
        writeRefreshToken(null);
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });

    return refreshInFlight;
  }

  async function request<TResponse>(
    config: AxiosRequestConfig & { retried?: boolean },
  ): Promise<TResponse> {
    try {
      const response = await axiosInstance.request<TResponse>(config);
      return response.data;
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        throw error;
      }

      const status = error.response?.status;
      const shouldRefresh =
        status === 401 &&
        !config.retried &&
        config.url !== refreshPath &&
        config.url !== "/auth/login";

      if (shouldRefresh) {
        const nextToken = await refreshAccessToken();

        if (nextToken) {
          return request<TResponse>({ ...config, retried: true });
        }
      }

      throw toApiClientError(error as AxiosError);
    }
  }

  return {
    axios: axiosInstance,
    get: <TResponse = unknown>(path: string, config?: AxiosRequestConfig) =>
      request<TResponse>({ ...config, method: "GET", url: path }),
    post: <TResponse = unknown>(path: string, body?: RequestBody, config?: AxiosRequestConfig) =>
      request<TResponse>({ ...config, method: "POST", url: path, data: body }),
    patch: <TResponse = unknown>(path: string, body?: RequestBody, config?: AxiosRequestConfig) =>
      request<TResponse>({ ...config, method: "PATCH", url: path, data: body }),
    put: <TResponse = unknown>(path: string, body?: RequestBody, config?: AxiosRequestConfig) =>
      request<TResponse>({ ...config, method: "PUT", url: path, data: body }),
    delete: <TResponse = unknown>(path: string, config?: AxiosRequestConfig) =>
      request<TResponse>({ ...config, method: "DELETE", url: path }),
    upload: <TResponse = unknown>(path: string, formData: FormData) =>
      request<TResponse>({
        method: "POST",
        url: path,
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }),
    refresh: refreshAccessToken,
  };
}

export function createDefaultApiClient(baseURL: string): ApiClient {
  return createApiClient({
    baseURL,
    getAccessToken,
    setAccessToken,
  });
}

export { ApiClientError };
