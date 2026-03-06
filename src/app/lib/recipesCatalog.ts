import type { RecipesCatalogPayload } from './catalogRepository';
import { supabaseCatalogRepository } from './supabaseCatalogRepository';

export type { RecipesCatalogPayload };

export async function fetchRecipesCatalog(): Promise<RecipesCatalogPayload> {
  return supabaseCatalogRepository.fetchCatalog();
}

export async function fetchRecipesCatalogForUser(userId: string, activeListId?: string | null): Promise<RecipesCatalogPayload> {
  if (supabaseCatalogRepository.fetchCatalogForUser) {
    return supabaseCatalogRepository.fetchCatalogForUser(userId, activeListId);
  }
  return supabaseCatalogRepository.fetchCatalog();
}
