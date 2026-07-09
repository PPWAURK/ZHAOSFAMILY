export type QuantityMap = Record<string, string>;

export type OrderSupplier = {
  id: string;
  name: string;
  sortOrder?: number | null;
  includeAllProductsInOrder?: boolean | null;
};

export type OrderProductVariant = {
  id: string;
  specification: string | null;
  unit: string | null;
  price: number | null;
};

export type OrderProduct = {
  id: string;
  supplierId: string;
  reference?: string | null;
  category?: string | null;
  nameCn?: string | null;
  nameFr?: string | null;
  image?: string | null;
  unit?: string | null;
  price: number | null;
  specification?: string | null;
  specification2?: string | null;
  specification3?: string | null;
  unit2?: string | null;
  unit3?: string | null;
  price2: number | null;
  price3: number | null;
  variants: OrderProductVariant[];
};

export type OrderProductApiRecord = {
  id: number | string;
  supplierId: number | string;
  reference?: string | null;
  category?: string | null;
  nameCn?: string | null;
  designationFr?: string | null;
  unit?: string | null;
  unit2?: string | null;
  unit3?: string | null;
  unitPriceHt?: number | null;
  unitPriceHt2?: number | null;
  unitPriceHt3?: number | null;
  image?: string | null;
  specification?: string | null;
  specification2?: string | null;
  specification3?: string | null;
};

export type OrderInventoryLine = {
  id: number | string;
  stock?: number | null;
};

export type OrderStockMap = Record<string, number>;

export type CreateOrderItem = {
  productId: number;
  quantity: number;
  specificationSlot?: number;
};

export type PurchaseOrder = {
  id?: number | string;
  number?: string;
  restaurantName?: string;
  supplierName?: string;
  deliveryDate?: string;
  totalItems?: number;
  totalAmount?: number;
  commandeUrl?: string;
  bonUrl?: string;
};

export type OrderHistoryItem = PurchaseOrder & {
  id: number | string;
  number: string;
  supplierId?: number | string;
  returnCount?: number;
  canEdit?: boolean;
  canReturn?: boolean;
  canDelete?: boolean;
  createdAt?: string;
};

export type OrderDetailItem = {
  purchaseOrderItemId: number;
  productId: string;
  specificationSlot?: number | null;
  quantity: number;
  nameZh?: string | null;
  nameFr?: string | null;
  specification?: string | null;
  unit?: string | null;
  category?: string | null;
};

export type OrderDetail = OrderHistoryItem & {
  supplierId: number | string;
  supplierName: string;
  deliveryDate: string;
  items: OrderDetailItem[];
};

export type OrderReturnDraftItem = OrderDetailItem & {
  orderedQuantity: number;
  returnedQuantity: number;
  remainingQuantity: number;
};

export type OrderReturnDraft = {
  orderId: number | string;
  orderNumber: string;
  supplierId: number | string;
  supplierName: string;
  deliveryDate: string;
  items: OrderReturnDraftItem[];
};

export type ReturnQuantityMap = Record<string, string>;
