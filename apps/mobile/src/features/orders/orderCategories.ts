import type { AuthLanguage } from "@/features/auth/authCopy";

const CATEGORY_LABELS: Record<string, Record<AuthLanguage, string>> = {
  boisson: { zh: "饮品", en: "Drinks", fr: "Boissons" },
  boissons: { zh: "饮品", en: "Drinks", fr: "Boissons" },
  beverage: { zh: "饮品", en: "Drinks", fr: "Boissons" },
  drinks: { zh: "饮品", en: "Drinks", fr: "Boissons" },
  dry: { zh: "干货", en: "Dry goods", fr: "Epicerie seche" },
  epicerie: { zh: "杂货", en: "Grocery", fr: "Epicerie" },
  "epicerie seche": { zh: "干货", en: "Dry goods", fr: "Epicerie seche" },
  frais: { zh: "生鲜", en: "Fresh", fr: "Frais" },
  fresh: { zh: "生鲜", en: "Fresh", fr: "Frais" },
  frozen: { zh: "冷冻", en: "Frozen", fr: "Surgeles" },
  legumes: { zh: "蔬菜", en: "Vegetables", fr: "Legumes" },
  meat: { zh: "肉类", en: "Meat", fr: "Viande" },
  poisson: { zh: "鱼类", en: "Fish", fr: "Poisson" },
  "produits frais": { zh: "生鲜", en: "Fresh", fr: "Produits frais" },
  seafood: { zh: "海鲜", en: "Seafood", fr: "Fruits de mer" },
  surgele: { zh: "冷冻", en: "Frozen", fr: "Surgeles" },
  surgeles: { zh: "冷冻", en: "Frozen", fr: "Surgeles" },
  viande: { zh: "肉类", en: "Meat", fr: "Viande" },
  冷冻: { zh: "冷冻", en: "Frozen", fr: "Surgeles" },
  干货: { zh: "干货", en: "Dry goods", fr: "Epicerie seche" },
  水产: { zh: "水产", en: "Seafood", fr: "Fruits de mer" },
  海鲜: { zh: "海鲜", en: "Seafood", fr: "Fruits de mer" },
  生鲜: { zh: "生鲜", en: "Fresh", fr: "Frais" },
  肉类: { zh: "肉类", en: "Meat", fr: "Viande" },
  蔬菜: { zh: "蔬菜", en: "Vegetables", fr: "Legumes" },
  饮品: { zh: "饮品", en: "Drinks", fr: "Boissons" },
};

export function translateOrderCategory(
  category: string | null | undefined,
  language: AuthLanguage,
): string {
  const safeCategory = category?.trim();

  if (!safeCategory) {
    return "-";
  }

  return CATEGORY_LABELS[normalizeCategoryKey(safeCategory)]?.[language] ?? safeCategory;
}

function normalizeCategoryKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
