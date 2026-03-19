import type { RecipeV2 } from '../types/recipe-v2';
import { loadLocalRecipeCatalogV2 } from './localRecipeCatalogV2';

export const recipeRepositoryV2 = {
  async fetchLocal(): Promise<Record<string, RecipeV2>> {
    const catalog = await loadLocalRecipeCatalogV2();
    return catalog.recipeById;
  },
};
