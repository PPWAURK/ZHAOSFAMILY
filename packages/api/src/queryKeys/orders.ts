export const ordersQueryKeys = {
  all: ["orders"] as const,
  history: () => ["orders", "history"] as const,
  products: (supplierId: number | string) =>
    ["orders", "products", String(supplierId)] as const,
  suppliers: () => ["orders", "suppliers"] as const,
};
