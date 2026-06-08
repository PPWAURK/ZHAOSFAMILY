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
};
