export type ProductSummary = {
  id: string;
  supplierId: number;
  reference: string | null;
  category: string;
  nameCn: string;
  designationFr: string | null;
  unit: string | null;
  unitPriceHt: number | null;
  image: string | null;
  specification: string | null;
  specification2: string | null;
  specification3: string | null;
  unit2: string | null;
  unit3: string | null;
  unitPriceHt2: number | null;
  unitPriceHt3: number | null;
};

export type ProductDetail = ProductSummary;

export type ProductResponse = ProductSummary;

