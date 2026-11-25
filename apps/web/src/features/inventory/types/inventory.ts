export type InventoryApiRecord = {
  id: number | string;
  supplierId?: number | string | null;
  reference?: string | null;
  category?: string | null;
  nameCn?: string | null;
  designationFr?: string | null;
  image?: string | null;
  unit?: string | null;
  specification?: string | null;
  stock?: number | null;
};

export type InventoryLine = {
  id: string;
  supplierId: number;
  reference: string;
  category: string;
  nameCn: string;
  designationFr: string;
  image: string;
  unit: string;
  specification: string;
  stock: number;
};

export type InventoryMovementApiRecord = {
  id: number | string;
  productId?: number | string | null;
  productNameCn?: string | null;
  productDesignationFr?: string | null;
  delta?: number | string | null;
  reason?: string | null;
  source?: string | null;
  sourceId?: string | null;
  userId?: number | string | null;
  restaurantId?: number | string | null;
  occurredAt?: string | null;
  createdAt?: string | null;
};

export type InventoryMovement = {
  id: string;
  productId: string;
  productNameCn: string;
  productDesignationFr: string;
  delta: number;
  reason: string;
  source: string;
  sourceId: string;
  userId: number | string | null;
  restaurantId: number | null;
  occurredAt?: string | null;
  createdAt?: string | null;
};

export type InventoryMovementFilters = {
  supplierId?: string;
  productId?: string;
  limit?: number;
};

export type CreateInventoryMovementInput = {
  productId: number | string;
  delta: number | string;
  reason?: string;
  source?: string;
  sourceId?: string;
  /** Business date YYYY-MM-DD; defaults to now on the server. */
  occurredOn?: string;
  /** Destination store, outbound only. */
  restaurantId?: number | string;
};

/** in / out = manual movements; store_order = a store's purchase-order line. */
export type InventoryRecordType = "in" | "out" | "store_order";

export type InventoryRecord = {
  id: string;
  type: InventoryRecordType;
  date: string;
  supplierId: number;
  productId: string;
  productReference: string | null;
  productNameCn: string;
  productDesignationFr: string | null;
  specification: string | null;
  unit: string | null;
  quantity: number;
  restaurantId: number | null;
  restaurantName: string | null;
  orderNumber: string | null;
  deliveryDate: string | null;
  unitPriceHt: string | null;
  lineTotal: string | null;
  handlerName: string | null;
  note: string | null;
};

export type InventoryRecordsResponse = {
  month: string;
  records: InventoryRecord[];
};

export type InventoryRecordFilters = {
  month: string;
  supplierIds: readonly (number | string)[];
  restaurantId?: string;
};
