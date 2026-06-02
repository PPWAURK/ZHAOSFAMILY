export const suppliersQueryKeys = {
  all: ["suppliers"] as const,
  lists: () => ["suppliers", "list"] as const,
  detail: (id: number | string) => ["suppliers", "detail", String(id)] as const,
};

