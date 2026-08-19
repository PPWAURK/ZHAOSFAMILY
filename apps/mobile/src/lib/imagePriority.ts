export const APP_IMAGE_LOAD_PRIORITIES = {
  critical: "high",
  important: "normal",
  lazy: "low",
} as const;

export type AppImageLoadPriority = keyof typeof APP_IMAGE_LOAD_PRIORITIES;
