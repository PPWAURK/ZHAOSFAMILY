export const restaurantsQueryKeys = {
  all: ["restaurants"] as const,
  lists: () => ["restaurants", "list"] as const,
  detail: (id: number | string) => ["restaurants", "detail", String(id)] as const,
};

