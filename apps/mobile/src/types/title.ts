export type TitleCategory =
  | "growth"
  | "front"
  | "kitchen"
  | "management"
  | "fun"
  | "premium";

export type TitleRarity = "common" | "rare" | "epic" | "legendary";

export type TitleFrameSize = "sm" | "md" | "lg";

export type TitleIconType =
  | "plant"
  | "chef"
  | "cooking"
  | "flash"
  | "girl"
  | "prestige"
  | "trusted"
  | "sprout"
  | "star"
  | "growth-line"
  | "smile"
  | "service-bell"
  | "door"
  | "flame"
  | "spatula"
  | "bowl"
  | "flag"
  | "mountain"
  | "compass"
  | "lightning"
  | "shield"
  | "swap"
  | "crown"
  | "laurel"
  | "diamond";

export interface TitleCatalogItem {
  id: string;
  category: TitleCategory;
  rarity: TitleRarity;
  level?: number;
  i18nKey: string;
  iconType: TitleIconType;
  unlockHintKey?: string;
}

export const TITLE_CATEGORY_ORDER: readonly TitleCategory[] = [
  "growth",
  "front",
  "kitchen",
  "management",
  "fun",
  "premium",
] as const;
