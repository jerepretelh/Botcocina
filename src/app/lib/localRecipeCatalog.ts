import type { Recipe, RecipeContent } from '../../types/index.js';

type LocalRecipeCatalog = {
  defaultRecipes: Recipe[];
  initialRecipeContent: Record<string, RecipeContent>;
};

let localRecipeCatalogPromise: Promise<LocalRecipeCatalog> | null = null;

export async function loadLocalRecipeCatalog(): Promise<LocalRecipeCatalog> {
  if (!localRecipeCatalogPromise) {
    localRecipeCatalogPromise = import('../data/recipes').then((module) => ({
      defaultRecipes: module.defaultRecipes,
      initialRecipeContent: module.defaultRecipeContent ?? module.initialRecipeContent,
    }));
  }

  return localRecipeCatalogPromise;
}
