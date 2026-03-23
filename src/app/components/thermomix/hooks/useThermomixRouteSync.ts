import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { Recipe, Screen } from '../../../../types';
import type { RuntimeHydratedRecipeSelection } from '../lib/controllerTypes';
import {
  cleanupOverlayContextForPath,
  syncPathToState,
  syncStateToPath,
  type RouteSyncOverlayController,
  type RouteSyncRecipeSelectionController,
} from '../lib/routeSyncEffects';

type UseThermomixRouteSyncArgs = {
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

export function useThermomixRouteSync(args: UseThermomixRouteSyncArgs) {
  useEffect(() => {
    syncPathToState(args);
  }, [
    args.pathname,
    args.navigate,
    args.routeSyncRef,
    args.lastProcessedRoutePathRef,
    args.currentScreenRef,
    args.currentRecipeOverlayHostScreenRef,
    args.recipeSelection,
    args.overlay,
    args.recipeCategories,
    args.selectableRecipesById,
    args.hydrateRecipeSelection,
    args.enterRecipeCookingRuntime,
    args.setTimerScaleFactor,
    args.setTimingAdjustedLabel,
  ]);

  useEffect(() => {
    syncStateToPath({
      pathname: args.pathname,
      navigate: args.navigate,
      routeSyncRef: args.routeSyncRef,
      recipeSelection: args.recipeSelection,
      overlay: args.overlay,
    });
  }, [
    args.pathname,
    args.navigate,
    args.routeSyncRef,
    args.recipeSelection.screen,
    args.recipeSelection.selectedCategory,
    args.recipeSelection.selectedRecipe?.id,
    args.overlay.isRecipeSetupSheetOpen,
    args.overlay.isIngredientsSheetOpen,
    args.overlay.recipeOverlayPinnedPath,
  ]);

  useEffect(() => {
    cleanupOverlayContextForPath({
      pathname: args.pathname,
      screen: args.recipeSelection.screen,
      resetRecipeOverlayNavigationContext: args.overlay.resetRecipeOverlayNavigationContext,
    });
  }, [args.pathname, args.overlay, args.recipeSelection.screen]);
}
