import type { Screen } from '../../types';
import { GLOBAL_RECIPES_ALL_PATH, GLOBAL_RECIPES_HOME_PATH } from './globalRecipesRoute';

export function isRecipeOverlayRoute(pathname: string): boolean {
  return /^\/recetas\/[^/]+\/(configurar|ingredientes)$/.test(pathname);
}

export function resolveOverlayPinnedRoute(args: {
  screen: Screen;
  recipeId: string | null;
  selectedCategory: string | null;
  isRecipeSetupSheetOpen: boolean;
  isIngredientsSheetOpen: boolean;
  recipeOverlayPinnedPath: string | null;
}): string | null {
  const {
    screen,
    recipeId,
    selectedCategory,
    isRecipeSetupSheetOpen,
    isIngredientsSheetOpen,
    recipeOverlayPinnedPath,
  } = args;

  const activeRecipeOverlay = isIngredientsSheetOpen ? 'ingredients' : isRecipeSetupSheetOpen ? 'recipe-setup' : null;

  const targetPath =
    recipeOverlayPinnedPath && activeRecipeOverlay && screen !== 'cooking'
      ? recipeOverlayPinnedPath
      : screen === 'category-select'
        ? '/'
        : screen === 'global-recipes'
          ? GLOBAL_RECIPES_HOME_PATH
        : screen === 'recipe-select'
          ? selectedCategory ? `/recetas-globales/${selectedCategory}` : GLOBAL_RECIPES_ALL_PATH
          : screen === 'recipe-setup' || screen === 'ingredients' || screen === 'cooking'
            ? recipeId
              ? activeRecipeOverlay === 'recipe-setup'
                ? `/recetas/${recipeId}/configurar`
                : activeRecipeOverlay === 'ingredients'
                  ? `/recetas/${recipeId}/ingredientes`
                  : `/recetas/${recipeId}/cocinar`
              : null
            : '/';

  return targetPath;
}
