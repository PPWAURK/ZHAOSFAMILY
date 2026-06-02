export type TokenStorage = {
  getAccessToken: () => Promise<string | null>;
  setAccessToken: (token: string) => Promise<void>;
  removeAccessToken: () => Promise<void>;
  getRefreshToken: () => Promise<string | null>;
  setRefreshToken: (token: string) => Promise<void>;
  removeRefreshToken: () => Promise<void>;
};

export function createMemoryTokenStorage(): TokenStorage {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  return {
    getAccessToken: async () => accessToken,
    setAccessToken: async (token) => {
      accessToken = token;
    },
    removeAccessToken: async () => {
      accessToken = null;
    },
    getRefreshToken: async () => refreshToken,
    setRefreshToken: async (token) => {
      refreshToken = token;
    },
    removeRefreshToken: async () => {
      refreshToken = null;
    },
  };
}
