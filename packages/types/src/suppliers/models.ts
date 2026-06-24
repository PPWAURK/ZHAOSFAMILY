export type SupplierSummary = {
  id: number;
  name: string;
  sortOrder: number;
  includeAllProductsInOrder: boolean;
  orderNotice: string | null;
};

export type SupplierDetail = SupplierSummary;

export type SupplierResponse = SupplierSummary;

