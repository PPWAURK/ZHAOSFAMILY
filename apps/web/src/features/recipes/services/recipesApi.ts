import { createRecipesApi } from '@zhao/api';
import type {
  CreateRecipeRequest,
  ListRecipesQuery,
  Recipe,
  UpdateRecipeRequest,
} from '@zhao/types';
import { API_URL, apiClient } from '@/shared/api/api-client';

const recipesApi = createRecipesApi(apiClient);

type RecipeImageUploadResult = {
  imagePath?: string;
};

export function fetchRecipes(query?: ListRecipesQuery): Promise<Recipe[]> {
  return recipesApi.list(query);
}

export function createRecipe(input: CreateRecipeRequest): Promise<Recipe> {
  return recipesApi.create(input);
}

export function updateRecipe(
  id: number,
  input: UpdateRecipeRequest,
): Promise<Recipe> {
  return recipesApi.update(id, input);
}

export async function uploadRecipeImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const result = await apiClient.upload<RecipeImageUploadResult>(
    '/recipes/images',
    formData,
  );

  if (!result.imagePath) {
    throw new Error('图片上传未返回文件路径。');
  }

  return result.imagePath;
}

export function resolveRecipeImageUrl(imagePath: string): string {
  return imagePath.startsWith('/recipes/images/')
    ? `${API_URL}${imagePath}`
    : imagePath;
}
