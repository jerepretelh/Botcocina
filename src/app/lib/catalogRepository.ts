import type { Recipe, RecipeContent } from '../../types';

export interface RecipesCatalogPayload {
  source: 'supabase' | 'local-dev';
  warning?: string;
  recipes: Recipe[];
  recipeContentById: Record<string, RecipeContent>;
}

export interface CatalogRepository {
  fetchCatalog: () => Promise<RecipesCatalogPayload>;
}

