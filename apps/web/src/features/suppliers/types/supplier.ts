export type SupplierApiRecord = {
  id: number | string;
  name?: string | null;
  sortOrder?: number | null;
  includeAllProductsInOrder?: boolean | null;
  orderNotice?: string | null;
};

export type SupplierSummary = {
  id: string;
  numericId: number;
  name: string;
  sortOrder: number;
  includeAllProductsInOrder: boolean;
  orderNotice: string;
};

export type SupplierInput = {
  name: string;
  sortOrder?: number;
  includeAllProductsInOrder?: boolean;
  orderNotice?: string;
};

export type SupplierPatch = Partial<SupplierInput>;

export type ProductApiRecord = {
  id: number | string;
  supplierId?: number | string | null;
  reference?: string | null;
  category?: string | null;
  nameCn?: string | null;
  designationFr?: string | null;
  unit?: string | null;
  unitPriceHt?: number | null;
  image?: string | null;
  specification?: string | null;
};

export type SupplierProduct = {
  id: string;
  supplierId: number;
  reference: string;
  category: string;
  nameCn: string;
  designationFr: string;
  unit: string;
  price: number;
  image: string;
  specification: string;
};

export type SupplierProductInput = {
  reference?: string;
  category?: string;
  nameCn?: string;
  designationFr?: string;
  unit?: string;
  specification?: string;
  image?: string;
  price?: number | string;
};
