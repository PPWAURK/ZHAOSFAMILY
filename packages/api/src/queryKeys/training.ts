export const trainingQueryKeys = {
  all: ["training"] as const,
  myPlan: (userId: number | string, language: string) =>
    ["training", "my-plan", String(userId), language] as const,
};
