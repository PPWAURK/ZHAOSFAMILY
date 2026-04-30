const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

let accessToken = null;
let refreshInFlight = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken() {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      accessToken = null;
      return null;
    }

    const data = await res.json();
    accessToken = data.accessToken;
    return accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function parseResponseBody(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path, { method = "GET", body, retried = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (
    res.status === 401 &&
    !retried &&
    path !== "/auth/refresh" &&
    path !== "/auth/login"
  ) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      return request(path, { method, body, retried: true });
    }
  }

  const data = await parseResponseBody(res);

  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null ? data.message : data;
    const error = new Error(
      Array.isArray(message) ? message.join(", ") : message || `HTTP ${res.status}`,
    );

    error.status = res.status;
    error.payload = data;
    throw error;
  }

  return data;
}

async function upload(path, formData) {
  const headers = {};

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: formData,
  });

  const data = await parseResponseBody(res);

  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null ? data.message : data;
    const error = new Error(
      Array.isArray(message) ? message.join(", ") : message || `HTTP ${res.status}`,
    );

    error.status = res.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  delete: (path) => request(path, { method: "DELETE" }),
  upload,
  refresh: refreshAccessToken,
};
