export const storeManagementQueryKeys = {
  all: ["store-management"] as const,
  approvableUsers: (userId: number | string) =>
    ["store-management", "approvable-users", String(userId)] as const,
  stores: (userId: number | string) =>
    ["store-management", "stores", String(userId)] as const,
  trainingPositions: () => ["store-management", "training-positions"] as const,
};
