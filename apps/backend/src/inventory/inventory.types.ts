export type InventoryLineItem = {
  id: string;
  supplierId: number;
  reference: string | null;
  category: string;
  nameCn: string;
  designationFr: string | null;
  image: string | null;
  unit: string | null;
  specification: string | null;
  stock: number;
};

export type InventoryMovementItem = {
  id: string;
  productId: string;
  productNameCn: string;
  productDesignationFr: string | null;
  delta: number;
  reason: string | null;
  source: string;
  sourceId: string | null;
  userId: number | null;
  restaurantId: number | null;
  occurredAt: string;
  createdAt: string;
};

/** in / out = manual movements; store_order = purchase order lines of a store. */
export type InventoryRecordType = 'in' | 'out' | 'store_order';

export type InventoryRecordItem = {
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

export type InventoryRecordsResult = {
  month: string;
  records: InventoryRecordItem[];
};
