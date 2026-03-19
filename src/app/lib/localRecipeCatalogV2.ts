import type { RecipeV2 } from '../types/recipe-v2';

type LocalRecipeCatalogV2 = {
  recipes: RecipeV2[];
  recipeById: Record<string, RecipeV2>;
};

let localRecipeCatalogV2Promise: Promise<LocalRecipeCatalogV2> | null = null;

export async function loadLocalRecipeCatalogV2(): Promise<LocalRecipeCatalogV2> {
  if (!localRecipeCatalogV2Promise) {
    const baseCatalog = import('../data/recipes.v2').then((module) => ({
      recipes: module.localRecipesV2,
      recipeById: module.localRecipeV2ById,
    }));

    localRecipeCatalogV2Promise = baseCatalog.then(async (catalog) => {
      if (!import.meta.env.DEV) {
        return catalog;
      }

      const testCatalog = await import('../../dev/recipes/testRecipesV2');
      return {
        recipes: [...catalog.recipes, ...testCatalog.localTestRecipesV2],
        recipeById: {
          ...catalog.recipeById,
          ...testCatalog.localTestRecipeV2ById,
        },
      };
    });
  }

  return localRecipeCatalogV2Promise;
}
