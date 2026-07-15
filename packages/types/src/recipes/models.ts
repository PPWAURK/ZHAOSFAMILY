export type RecipeStatus = 'draft' | 'published';

export type RecipeLocalizedText = {
  zh: string;
  fr: string;
};

export type RecipeIngredient = {
  id: number;
  name: RecipeLocalizedText;
  quantity: number;
  unit: RecipeLocalizedText;
  sortOrder: number;
};

export type RecipeStep = {
  id: number;
  instruction: RecipeLocalizedText;
  sortOrder: number;
};

export type Recipe = {
  id: number;
  name: RecipeLocalizedText;
  category: RecipeLocalizedText;
  tags: RecipeLocalizedText[];
  servings: number;
  preparationMinutes: number;
  cookingMinutes: number;
  coverImageUrl: string | null;
  finishedImageUrl: string | null;
  note: RecipeLocalizedText | null;
  status: RecipeStatus;
  jobRoles: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  createdAt: string;
  updatedAt: string;
};
