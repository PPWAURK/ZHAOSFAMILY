import type {
  CreateRecipeRequest,
  ListRecipesQuery,
  Recipe,
  UpdateRecipeRequest,
} from '@zhao/types';
import type { ApiClient } from '../client';

export type RecipesApi = {
  list: (query?: ListRecipesQuery) => Promise<Recipe[]>;
  get: (id: number) => Promise<Recipe>;
  create: (input: CreateRecipeRequest) => Promise<Recipe>;
  update: (id: number, input: UpdateRecipeRequest) => Promise<Recipe>;
  remove: (id: number) => Promise<void>;
};

function buildQuery(query?: ListRecipesQuery): string {
  if (!query) return '';

  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.category) params.set('category', query.category);
  if (query.search) params.set('search', query.search);
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize));
  const serialized = params.toString();

  return serialized ? `?${serialized}` : '';
}

export function createRecipesApi(apiClient: ApiClient): RecipesApi {
  return {
    list: (query) => apiClient.get<Recipe[]>(`/recipes${buildQuery(query)}`),
    get: (id) => apiClient.get<Recipe>(`/recipes/${id}`),
    create: (input) => apiClient.post<Recipe>('/recipes', input),
    update: (id, input) => apiClient.patch<Recipe>(`/recipes/${id}`, input),
    remove: (id) => apiClient.delete<void>(`/recipes/${id}`),
  };
}
