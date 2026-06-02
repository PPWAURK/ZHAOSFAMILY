import type { ListProductsQuery } from "@zhao/types";

export const productsQueryKeys = {
  all: ["products"] as const,
  list: (query: ListProductsQuery) => ["products", "list", query] as const,
  bySupplier: (supplierId: number | string) =>
    ["products", "supplier", String(supplierId)] as const,
  detail: (id: number | string) => ["products", "detail", String(id)] as const,
};

