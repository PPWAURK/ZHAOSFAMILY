export const storeManagementQueryKeys = {
  all: ["store-management"] as const,
  overview: (userId: number | string) =>
    ["store-management", "overview", String(userId)] as const,
};
