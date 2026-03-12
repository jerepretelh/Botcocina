import type { RecipesCatalogPayload } from './catalogRepository';
import { supabaseCatalogRepository } from './supabaseCatalogRepository';
import { loadLocalRecipeCatalog } from './localRecipeCatalog';

export type { RecipesCatalogPayload };

const forceLocalCatalog = (import.meta.env.VITE_FORCE_LOCAL_CATALOG ?? 'false').trim().toLowerCase() === 'true';

export async function fetchRecipesCatalog(): Promise<RecipesCatalogPayload> {
  if (forceLocalCatalog) {
    const localCatalog = await loadLocalRecipeCatalog();
    return {
      source: 'local-dev',
      warning: 'Catálogo local forzado por VITE_FORCE_LOCAL_CATALOG=true.',
      recipes: localCatalog.defaultRecipes,
      recipeContentById: localCatalog.initialRecipeContent,
    };
  }
  return supabaseCatalogRepository.fetchCatalog();
}

export async function fetchRecipesCatalogForUser(userId: string, activeListId?: string | null): Promise<RecipesCatalogPayload> {
  if (forceLocalCatalog) {
    const localCatalog = await loadLocalRecipeCatalog();
    return {
      source: 'local-dev',
      warning: 'Catálogo local forzado por VITE_FORCE_LOCAL_CATALOG=true.',
      recipes: localCatalog.defaultRecipes,
      recipeContentById: localCatalog.initialRecipeContent,
    };
  }
  if (supabaseCatalogRepository.fetchCatalogForUser) {
    return supabaseCatalogRepository.fetchCatalogForUser(userId, activeListId);
  }
  return supabaseCatalogRepository.fetchCatalog();
}
