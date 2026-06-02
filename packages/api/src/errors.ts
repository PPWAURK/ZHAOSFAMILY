import type { AxiosError } from "axios";
import type { ApiErrorPayload } from "@zhao/types";

export class ApiClientError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

function resolveErrorMessage(payload: unknown, status: number): string {
  const message =
    typeof payload === "object" && payload !== null
      ? (payload as ApiErrorPayload).message
      : payload;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  return typeof message === "string" && message.length > 0 ? message : `HTTP ${status}`;
}

export function toApiClientError(error: AxiosError): ApiClientError {
  const status = error.response?.status ?? 0;
  const payload = error.response?.data ?? null;
  return new ApiClientError(resolveErrorMessage(payload, status), status, payload);
}

