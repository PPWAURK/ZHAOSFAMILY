export type ListProductsQuery = {
  supplierId: number;
  includeInactive?: boolean;
};

export type CreateProductRequest = {
  supplierId: number;
  isActive?: boolean;
  reference?: string;
  category: string;
  nameCn: string;
  designationFr?: string;
  unit?: string;
  unitPriceHt?: number;
  caseSize?: number | null;
  caseSize2?: number | null;
  caseSize3?: number | null;
  image?: string;
  specification?: string;
};

export type UpdateProductRequest = Partial<CreateProductRequest> & {
  isInStock?: boolean;
};

export type ReorderProductsRequest = {
  supplierId: number;
  productIds: string[];
};
