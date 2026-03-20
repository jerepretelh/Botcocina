import type { RecipeCategoryId, Screen } from '../../types';
import { GLOBAL_RECIPES_ALL_PATH, GLOBAL_RECIPES_HOME_PATH } from './globalRecipesRoute';

export type RecipeOverlayHostScreen = 'global-recipes' | 'recipe-select' | 'compound-lab';
export type RecipePresentationMode = 'journey-page' | 'legacy-overlay';

function isRecipeOverlayHostCandidate(screen: Screen | null): screen is RecipeOverlayHostScreen {
  return screen === 'global-recipes' || screen === 'recipe-select' || screen === 'compound-lab';
}

export function resolveRecipePresentationMode(isUnifiedJourneyRecipe: boolean): RecipePresentationMode {
  return isUnifiedJourneyRecipe ? 'journey-page' : 'legacy-overlay';
}

export function resolveRecipeOverlayHostScreen(currentScreen: Screen, currentHostScreen: Screen | null): RecipeOverlayHostScreen {
  if (isRecipeOverlayHostCandidate(currentScreen)) return currentScreen;
  if (isRecipeOverlayHostCandidate(currentHostScreen)) return currentHostScreen;
  return 'recipe-select';
}

export function resolveRecipeOverlayHostPath(args: {
  screen: Screen;
  selectedCategory: RecipeCategoryId | null;
  currentLocationPath: string;
}): string {
  const { screen, selectedCategory, currentLocationPath } = args;
  if (screen === 'compound-lab') return '/experimentos/recetas-compuestas';
  if (screen === 'global-recipes') return GLOBAL_RECIPES_HOME_PATH;
  if (screen === 'recipe-select') {
    return selectedCategory
      ? `/recetas-globales/${encodeURIComponent(selectedCategory)}`
      : GLOBAL_RECIPES_ALL_PATH;
  }
  return currentLocationPath;
}

export function resolveRecipeOverlayCloseDestination(args: {
  currentScreen: Screen;
  currentHostScreen: Screen | null;
  explicitHostPath: string | null;
  selectedCategory: RecipeCategoryId | null;
}): { screen: RecipeOverlayHostScreen; path: string } {
  const hostScreen = resolveRecipeOverlayHostScreen(args.currentScreen, args.currentHostScreen);
  if (args.explicitHostPath) {
    return {
      screen: hostScreen,
      path: args.explicitHostPath,
    };
  }

  if (hostScreen === 'global-recipes') {
    return { screen: hostScreen, path: GLOBAL_RECIPES_HOME_PATH };
  }
  if (hostScreen === 'compound-lab') {
    return { screen: hostScreen, path: '/experimentos/recetas-compuestas' };
  }
  return {
    screen: hostScreen,
    path: args.selectedCategory
      ? `/recetas-globales/${encodeURIComponent(args.selectedCategory)}`
      : GLOBAL_RECIPES_ALL_PATH,
  };
}

export function resolveOverlayPinnedPath(args: {
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

  if (recipeOverlayPinnedPath && activeRecipeOverlay && screen !== 'cooking') {
    return recipeOverlayPinnedPath;
  }
  if (screen === 'category-select') return '/';
  if (screen === 'global-recipes') return GLOBAL_RECIPES_HOME_PATH;
  if (screen === 'recipe-select') {
    return selectedCategory ? `/recetas-globales/${selectedCategory}` : GLOBAL_RECIPES_ALL_PATH;
  }
  if (screen === 'recipe-setup' || screen === 'ingredients' || screen === 'cooking') {
    if (!recipeId) return null;
    if (activeRecipeOverlay === 'recipe-setup') return `/recetas/${recipeId}/configurar`;
    if (activeRecipeOverlay === 'ingredients') return `/recetas/${recipeId}/ingredientes`;
    return `/recetas/${recipeId}/cocinar`;
  }
  return '/';
}
