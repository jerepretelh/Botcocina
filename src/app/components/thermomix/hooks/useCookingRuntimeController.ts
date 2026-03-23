import type { MutableRefObject } from 'react';
import type { Screen } from '../../../../types';
import type { useScaledRecipe } from '../../../hooks/useScaledRecipe';
import type { useCompoundCookingSessionV2 } from '../../../hooks/useCompoundCookingSessionV2';
import type { useCookingProgress } from '../../../hooks/useCookingProgress';
import type { useCookingProgressV2 } from '../../../hooks/useCookingProgressV2';
import type { useRecipeSelection } from '../../../hooks/useRecipeSelection';
import type { useThermomixTimerV2 } from '../../../hooks/useThermomixTimerV2';
import { resolveRecipeOverlayCloseDestination } from '../../../lib/recipeNavigation';
import type { usePlanningController } from './usePlanningController';
import type { useRecipeOverlayController } from './useRecipeOverlayController';
import { useThermomixCookingRuntimeEntry } from './useThermomixCookingRuntimeEntry';
import { useThermomixPlannedRuntimeHandoff } from './useThermomixPlannedRuntimeHandoff';

type RecipeSelectionController = ReturnType<typeof useRecipeSelection>;
type CookingProgressController = ReturnType<typeof useCookingProgress>;
type StandardCookingController = ReturnType<typeof useCookingProgressV2>;
type StandardTimerController = ReturnType<typeof useThermomixTimerV2>;
type CompoundCookingController = ReturnType<typeof useCompoundCookingSessionV2>;
type OverlayController = ReturnType<typeof useRecipeOverlayController>;
type PlanningController = ReturnType<typeof usePlanningController>;

type UseCookingRuntimeControllerArgs = {
  navigate: (path: string) => void;
  pathname: string;
  routeSyncRef: MutableRefObject<boolean>;
  screen: Screen;
  recipeSelection: RecipeSelectionController;
  cookingProgress: CookingProgressController;
  standardCooking: StandardCookingController;
  standardTimer: StandardTimerController;
  compoundCooking: CompoundCookingController;
  scaledCompoundRecipe: ReturnType<typeof useScaledRecipe>;
  runtimeRecipesById: Map<string, RecipeSelectionController['selectedRecipe']>;
  overlay: OverlayController;
  planning: PlanningController;
};

export function useCookingRuntimeController(args: UseCookingRuntimeControllerArgs) {
  const runtimeEntry = useThermomixCookingRuntimeEntry({
    recipeSelection: args.recipeSelection,
    cookingProgress: args.cookingProgress,
    standardCooking: args.standardCooking,
    standardTimer: args.standardTimer,
    compoundCooking: args.compoundCooking,
    scaledCompoundRecipe: args.scaledCompoundRecipe,
    clearRecipeOverlaySheets: args.overlay.clearRecipeOverlaySheets,
  });

  const plannedHandoff = useThermomixPlannedRuntimeHandoff({
    navigate: args.navigate,
    pathname: args.pathname,
    routeSyncRef: args.routeSyncRef,
    screen: args.screen,
    recipeSelection: args.recipeSelection,
    cookingProgress: args.cookingProgress,
    runtimeRecipesById: args.runtimeRecipesById,
    overlay: args.overlay,
    planning: args.planning,
    enterRecipeCookingRuntime: runtimeEntry.enterRecipeCookingRuntime,
  });

  const exitCurrentRecipe = () => {
    const destination = resolveRecipeOverlayCloseDestination({
      currentScreen: args.screen,
      currentHostScreen: args.overlay.recipeOverlayHostScreen,
      explicitHostPath: args.overlay.recipeOverlayHostPath,
      selectedCategory: args.recipeSelection.selectedCategory,
    });

    args.standardCooking.reset();
    args.standardTimer.resetTimer();
    args.overlay.resetRecipeOverlayNavigationContext();
    if (destination.screen !== 'recipe-select') {
      args.recipeSelection.setSelectedCategory(null);
    }
    args.recipeSelection.setScreenDirect(destination.screen);
    args.navigate(destination.path);
  };

  return {
    ...runtimeEntry,
    ...plannedHandoff,
    exitCurrentRecipe,
  };
}
