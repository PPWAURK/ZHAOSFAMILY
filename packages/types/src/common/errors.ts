export type ApiErrorPayload = {
  message?: string | string[];
  code?: string;
  [key: string]: unknown;
};

