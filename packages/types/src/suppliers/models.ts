export type SupplierSummary = {
  id: number;
  name: string;
  sortOrder: number;
  includeAllProductsInOrder: boolean;
};

export type SupplierDetail = SupplierSummary;

export type SupplierResponse = SupplierSummary;

