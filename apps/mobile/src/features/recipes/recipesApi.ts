import { createRecipesApi } from '@zhao/api';
import type { ListRecipesQuery, Recipe } from '@zhao/types';
import { mobileApiClient } from '@/lib/api';

const recipesApi = createRecipesApi(mobileApiClient);

export function fetchRecipes(query?: ListRecipesQuery): Promise<Recipe[]> {
  return recipesApi.list(query);
}
