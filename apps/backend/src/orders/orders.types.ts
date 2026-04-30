export type OrdersRequestContext = {
  protocol: string;
  get: (name: string) => string | undefined;
};

export type OrderDocumentItem = {
  nameFr: string;
  nameZh: string;
  specification: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderDocumentInput = {
  filePath: string;
  orderNumber: string;
  supplierName: string;
  restaurantName: string;
  deliveryDate: string;
  deliveryAddress: string;
  items: OrderDocumentItem[];
  totalItems: number;
  totalAmount: number;
};
