export type QuantityMap = Record<string, number | string>;

export type CreateOrderItem = {
  productId: number;
  quantity: number;
  specificationSlot?: number;
};

export type CreatePurchaseOrderInput = {
  deliveryDate: string;
  quantities: QuantityMap;
};

export type PurchaseOrder = Record<string, unknown> & {
  id: number | string;
  number?: string | null;
  restaurantName?: string | null;
  deliveryDate?: string | null;
  bonUrl?: string | null;
  commandeUrl?: string | null;
};

export type PurchaseReturn = Record<string, unknown>;

export type CreatePurchaseReturnInput = Record<string, unknown>;

export type OrderSupplier = {
  id: string;
  name: string;
  sortOrder?: number | null;
  includeAllProductsInOrder?: boolean | null;
  orderNotice?: string | null;
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
  unit?: string | null;
  price: number | null;
  image?: string | null;
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

export type ProductOrderStatItem = {
  productId: string;
  nameZh: string;
  nameFr: string | null;
  unit: string | null;
  category: string;
  totalQuantity: number;
  totalAmount: number;
  orderLineCount: number;
};

export type SupplierOrderStatGroup = {
  supplierId: number;
  supplierName: string;
  totalQuantity: number;
  totalAmount: number;
  items: ProductOrderStatItem[];
};

export type OrderStatsStore = {
  id: number;
  name: string;
};

export type ProductOrderStats = {
  from: string | null;
  to: string | null;
  restaurantId: number | null;
  canViewAllStores: boolean;
  stores: OrderStatsStore[];
  totalProducts: number;
  totalQuantity: number;
  totalAmount: number;
  suppliers: SupplierOrderStatGroup[];
};

export type ProductOrderStatsParams = {
  from?: string;
  to?: string;
  restaurantId?: number;
};
