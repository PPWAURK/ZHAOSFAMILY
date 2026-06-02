export type CreateSupplierRequest = {
  name: string;
  sortOrder?: number;
  includeAllProductsInOrder?: boolean;
};

export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;

