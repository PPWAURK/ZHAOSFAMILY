import type { RecipeLocalizedText, RecipeStatus } from './models';

export type RecipeIngredientInput = {
  name: RecipeLocalizedText;
  quantity: number;
  unit: RecipeLocalizedText;
};

export type RecipeStepInput = {
  instruction: RecipeLocalizedText;
};

export type CreateRecipeRequest = {
  name: RecipeLocalizedText;
  category: RecipeLocalizedText;
  tags?: RecipeLocalizedText[];
  servings: number;
  preparationMinutes: number;
  cookingMinutes: number;
  coverImageUrl?: string;
  finishedImageUrl?: string;
  note?: RecipeLocalizedText;
  status?: RecipeStatus;
  jobRoles: string[];
  ingredients: RecipeIngredientInput[];
  steps: RecipeStepInput[];
};

export type UpdateRecipeRequest = Partial<CreateRecipeRequest>;

export type ListRecipesQuery = {
  status?: RecipeStatus;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};
