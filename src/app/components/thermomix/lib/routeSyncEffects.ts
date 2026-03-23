import type { MutableRefObject } from 'react';
import type { Recipe, RecipeCategoryId, Screen } from '../../../../types';
import type { RuntimeHydratedRecipeSelection } from './controllerTypes';
import { resolveRecipeOverlayHostScreen } from '../../../lib/recipeOverlayHostScreen';
import { resolveRecipePresentationMode } from '../../../lib/recipeNavigation';
import { isGlobalRecipesAllPath } from '../../../lib/globalRecipesRoute';
import { isUnifiedJourneyEnabled } from '../../../features/recipe-journey/compat/isUnifiedJourneyEnabled';
import { parseRecipeJourneyRoute } from '../../../features/recipe-journey/router/recipeJourneyRoute';
import {
  isHydrationSensitiveAppPath,
  normalizeAppPath,
  resolveStaticScreenForPath,
  resolveTargetPathFromState,
} from './routeSync';

export type RouteSyncOverlayController = {
  recipeOverlayPinnedPath: string | null;
  recipeOverlayHostScreen: Screen | null;
  isRecipeSetupSheetOpen: boolean;
  isIngredientsSheetOpen: boolean;
  setRecipeOverlayHostScreen: (screen: Screen | null) => void;
  setRecipeOverlayPinnedPath: (path: string | null) => void;
  clearRecipeOverlaySheets: () => void;
  openRecipeSetupSheet: () => void;
  openIngredientsSheet: () => void;
  resetRecipeOverlayNavigationContext: () => void;
};

export type RouteSyncRecipeSelectionController = {
  screen: Screen;
  selectedCategory: RecipeCategoryId | null;
  selectedRecipe: Recipe | null;
  availableRecipes: Recipe[];
  isSyncingCatalog: boolean;
  setSelectedCategory: (category: RecipeCategoryId | null) => void;
  setScreenDirect: (screen: Screen) => void;
};

export type SyncPathToStateArgs = {
  pathname: string;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  routeSyncRef: MutableRefObject<boolean>;
  lastProcessedRoutePathRef: MutableRefObject<string | null>;
  currentScreenRef: MutableRefObject<Screen>;
  currentRecipeOverlayHostScreenRef: MutableRefObject<Screen | null>;
  recipeSelection: RouteSyncRecipeSelectionController;
  overlay: RouteSyncOverlayController;
  recipeCategories: Array<{ id: string }>;
  selectableRecipesById: Map<string, Recipe>;
  hydrateRecipeSelection: (recipe: Recipe) => RuntimeHydratedRecipeSelection;
  enterRecipeCookingRuntime: (args: {
    recipe: Recipe;
    recipeV2: RuntimeHydratedRecipeSelection extends { recipeV2?: infer T } ? T : never;
    useDirectScreen?: boolean;
    compatOptions?: {
      content?: RuntimeHydratedRecipeSelection extends { content?: infer T } ? T : never;
      activeIngredientSelection?: Record<string, boolean>;
      quantityMode?: 'people' | 'have';
      peopleCount?: number;
      amountUnit?: 'units' | 'grams';
      availableCount?: number;
      portion?: number;
    };
  }) => void;
  setTimerScaleFactor: (value: number) => void;
  setTimingAdjustedLabel: (value: string) => void;
};

export function syncPathToState(args: SyncPathToStateArgs): void {
  const normalizedPath = normalizeAppPath(args.pathname);
  if (
    args.lastProcessedRoutePathRef.current === normalizedPath
    && !isHydrationSensitiveAppPath(normalizedPath)
  ) {
    return;
  }

  args.lastProcessedRoutePathRef.current = normalizedPath;
  args.routeSyncRef.current = true;

  const staticScreen = resolveStaticScreenForPath(normalizedPath);
  if (staticScreen) {
    if (staticScreen === 'category-select' || staticScreen === 'global-recipes' || staticScreen === 'recipe-select') {
      args.recipeSelection.setSelectedCategory(null);
    }
    args.recipeSelection.setScreenDirect(staticScreen);
    return;
  }

  const categoryMatch = normalizedPath.match(/^\/(?:categorias|recetas-globales)\/([^/]+)$/);
  if (categoryMatch) {
    const categoryId = decodeURIComponent(categoryMatch[1]);
    const isValidCategory = args.recipeCategories.some((category) => category.id === categoryId);
    if (!isValidCategory) {
      args.routeSyncRef.current = false;
      args.navigate('/', { replace: true });
      return;
    }
    args.recipeSelection.setSelectedCategory(categoryId as RecipeCategoryId);
    args.recipeSelection.setScreenDirect('recipe-select');
    return;
  }

  const recipeStageMatch = normalizedPath.match(/^\/recetas\/([^/]+)\/(configurar|ingredientes|cocinar)$/);
  if (recipeStageMatch) {
    const recipeId = decodeURIComponent(recipeStageMatch[1]);
    const stage = recipeStageMatch[2];
    const alreadyHydratedRecipe = args.recipeSelection.selectedRecipe?.id === recipeId;
    const alreadyOnCookingRoute = stage === 'cocinar' && alreadyHydratedRecipe && args.recipeSelection.screen === 'cooking';
    const alreadyOnSetupRoute =
      stage === 'configurar'
      && alreadyHydratedRecipe
      && (
        args.overlay.isRecipeSetupSheetOpen
        || (
          isUnifiedJourneyEnabled(recipeId)
          && /^\/recetas\/[^/]+\/configurar$/.test(normalizedPath)
        )
      );
    const alreadyOnIngredientsRoute = stage === 'ingredientes' && alreadyHydratedRecipe && args.overlay.isIngredientsSheetOpen;

    if (alreadyOnCookingRoute || alreadyOnSetupRoute || alreadyOnIngredientsRoute) {
      return;
    }

    const recipe = args.selectableRecipesById.get(recipeId)
      ?? args.recipeSelection.availableRecipes.find((item) => item.id === recipeId);

    if (!recipe) {
      if (args.recipeSelection.isSyncingCatalog) return;
      args.routeSyncRef.current = false;
      args.navigate('/', { replace: true });
      return;
    }

    const hydratedRecipe = args.hydrateRecipeSelection(recipe);
    const overlayHostScreen = resolveRecipeOverlayHostScreen(
      args.currentScreenRef.current,
      args.currentRecipeOverlayHostScreenRef.current,
    );
    const presentationMode = resolveRecipePresentationMode(isUnifiedJourneyEnabled(recipe.id));

    if (stage === 'configurar' || stage === 'ingredientes') {
      args.setTimerScaleFactor(1);
      args.setTimingAdjustedLabel('Tiempo estándar');
      args.recipeSelection.setScreenDirect(overlayHostScreen);
      args.overlay.setRecipeOverlayHostScreen(overlayHostScreen);
      if (presentationMode === 'journey-page') {
        args.overlay.clearRecipeOverlaySheets();
      } else {
        args.overlay.setRecipeOverlayPinnedPath(normalizedPath);
        if (stage === 'configurar') {
          args.overlay.openRecipeSetupSheet();
        } else {
          args.overlay.openIngredientsSheet();
        }
      }
      return;
    }

    args.enterRecipeCookingRuntime({
      recipe,
      recipeV2: hydratedRecipe?.recipeV2 ?? null,
      useDirectScreen: true,
      compatOptions: {
        content: hydratedRecipe?.content ?? null,
        activeIngredientSelection: hydratedRecipe?.hydratedSelection,
        quantityMode: hydratedRecipe?.quantityMode,
        peopleCount: hydratedRecipe?.peopleCount,
        amountUnit: hydratedRecipe?.amountUnit,
        availableCount: hydratedRecipe?.availableCount,
        portion: hydratedRecipe?.portion,
      },
    });
    return;
  }

  args.routeSyncRef.current = false;
  args.navigate('/', { replace: true });
}

export function syncStateToPath(args: {
  pathname: string;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  routeSyncRef: MutableRefObject<boolean>;
  recipeSelection: Pick<RouteSyncRecipeSelectionController, 'screen' | 'selectedCategory' | 'selectedRecipe'>;
  overlay: Pick<RouteSyncOverlayController, 'isRecipeSetupSheetOpen' | 'isIngredientsSheetOpen' | 'recipeOverlayPinnedPath'>;
}): void {
  if (args.routeSyncRef.current) {
    args.routeSyncRef.current = false;
    return;
  }

  const normalizedPath = normalizeAppPath(args.pathname);
  const parsedJourneyRoute = parseRecipeJourneyRoute(normalizedPath);
  if (
    parsedJourneyRoute.isValid &&
    parsedJourneyRoute.stage &&
    parsedJourneyRoute.stage !== 'cook' &&
    isUnifiedJourneyEnabled(parsedJourneyRoute.recipeId)
  ) {
    return;
  }

  if (
    args.recipeSelection.screen === 'category-select'
    && !args.overlay.isRecipeSetupSheetOpen
    && !args.overlay.isIngredientsSheetOpen
    && isGlobalRecipesAllPath(normalizedPath)
  ) {
    return;
  }

  const recipeId = args.recipeSelection.selectedRecipe?.id
    ? encodeURIComponent(args.recipeSelection.selectedRecipe.id)
    : null;
  const categoryId = args.recipeSelection.selectedCategory
    ? encodeURIComponent(args.recipeSelection.selectedCategory)
    : null;

  const targetPath = resolveTargetPathFromState({
    screen: args.recipeSelection.screen,
    recipeId,
    selectedCategory: categoryId,
    isRecipeSetupSheetOpen: args.overlay.isRecipeSetupSheetOpen,
    isIngredientsSheetOpen: args.overlay.isIngredientsSheetOpen,
    recipeOverlayPinnedPath: args.overlay.recipeOverlayPinnedPath,
  });

  if (targetPath && normalizedPath !== targetPath) {
    args.navigate(targetPath);
  }
}

export function cleanupOverlayContextForPath(args: {
  pathname: string;
  screen: Screen;
  resetRecipeOverlayNavigationContext: () => void;
}): void {
  if (args.screen === 'cooking') return;
  const normalizedPath = normalizeAppPath(args.pathname);
  if (/^\/recetas\/[^/]+\/(configurar|ingredientes)$/.test(normalizedPath)) return;
  const parsedRoute = parseRecipeJourneyRoute(normalizedPath);
  if (parsedRoute.isValid && parsedRoute.stage === 'cook') return;
  args.resetRecipeOverlayNavigationContext();
}
