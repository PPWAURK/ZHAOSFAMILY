export const dashboardNewsQueryKeys = {
  all: ["dashboard-news"] as const,
  lists: () => ["dashboard-news", "list"] as const,
  detail: (id: string) => ["dashboard-news", "detail", id] as const,
};
