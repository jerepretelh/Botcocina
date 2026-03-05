import type { RecipesCatalogPayload } from './catalogRepository';
import { supabaseCatalogRepository } from './supabaseCatalogRepository';

export type { RecipesCatalogPayload };

export async function fetchRecipesCatalog(): Promise<RecipesCatalogPayload> {
  return supabaseCatalogRepository.fetchCatalog();
}

