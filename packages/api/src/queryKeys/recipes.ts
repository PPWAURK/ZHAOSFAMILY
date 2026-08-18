export const recipesQueryKeys = {
  all: ["recipes"] as const,
  lists: () => ["recipes", "list"] as const,
  detail: (id: number | string) => ["recipes", "detail", String(id)] as const,
};
