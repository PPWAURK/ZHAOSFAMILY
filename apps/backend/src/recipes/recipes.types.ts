export const RECIPE_STATUSES = ['draft', 'published'] as const;

export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

export type RecipeActor = {
  id: number;
  jobRole: string | null;
  permissions: string[];
};

export type RecipeLocalizedText = {
  zh: string;
  fr: string;
};

export type RecipeIngredientItem = {
  id: number;
  name: RecipeLocalizedText;
  quantity: number;
  unit: RecipeLocalizedText;
  sortOrder: number;
};

export type RecipeStepItem = {
  id: number;
  instruction: RecipeLocalizedText;
  sortOrder: number;
};

export type RecipeItem = {
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
  ingredients: RecipeIngredientItem[];
  steps: RecipeStepItem[];
  createdAt: string;
  updatedAt: string;
};
