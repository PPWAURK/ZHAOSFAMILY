export type EntityId = number | string;

export type SortDirection = "asc" | "desc";

export type ApiRequestStatus = "idle" | "loading" | "success" | "error";

export type ApiSuccessResponse<TData> = {
  data: TData;
};

