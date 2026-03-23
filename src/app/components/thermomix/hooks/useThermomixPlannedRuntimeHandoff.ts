import { useMemo } from 'react';
import type { MutableRefObject } from 'react';
import type { Screen, WeeklyPlanItem } from '../../../../types';
import { hydratePlannedItemForRuntime } from '../../../lib/planningSnapshotV2';
import { resolvePlannedRecipeItem } from '../../../lib/plannedRecipeResolution';
import { resolvePersistedTargetYield } from '../../../lib/recipe-v2/resolvePersistedTargetYield';
import { resolveRecipeOverlayHostPath, resolveRecipePresentationMode } from '../../../lib/recipeNavigation';
import { resolveRecipeOverlayHostScreen } from '../../../lib/recipeOverlayHostScreen';
import { isUnifiedJourneyEnabled } from '../../../features/recipe-journey/compat/isUnifiedJourneyEnabled';
import { buildRecipeJourneyPath } from '../../../features/recipe-journey/router/recipeJourneyRoute';
import type {
  CookingProgressController,
  OverlayController,
  PlanningController,
  RecipeSelectionController,
} from '../lib/controllerTypes';
import type { EnterRecipeCookingRuntimeArgs } from './useThermomixCookingRuntimeEntry';

type UseThermomixPlannedRuntimeHandoffArgs = {
  navigate: (path: string) => void;
  pathname: string;
  routeSyncRef: MutableRefObject<boolean>;
  screen: Screen;
  recipeSelection: RecipeSelectionController;
  cookingProgress: CookingProgressController;
  runtimeRecipesById: Map<string, EnterRecipeCookingRuntimeArgs['recipe']>;
  overlay: OverlayController;
  planning: PlanningController;
  enterRecipeCookingRuntime: (args: EnterRecipeCookingRuntimeArgs) => void;
};

export function useThermomixPlannedRuntimeHandoff(args: UseThermomixPlannedRuntimeHandoffArgs) {
  const stablePathname = useMemo(() => args.pathname.replace(/\/+$/, '') || '/', [args.pathname]);

  const applyPlannedRecipeSnapshot = (item: WeeklyPlanItem, targetScreen: 'recipe-setup' | 'cooking') => {
    const { recipe } = resolvePlannedRecipeItem(item, args.runtimeRecipesById);
    if (!recipe) return;
    const content = args.recipeSelection.recipeContentById[recipe.id] ?? null;
    const recipeV2 = args.recipeSelection.recipeV2ById[recipe.id] ?? null;
    if (!content && !recipeV2) return;
    const setupPath = `/recetas/${encodeURIComponent(recipe.id)}/configurar`;
    const cookingPath = `/recetas/${encodeURIComponent(recipe.id)}/cocinar`;
    const hostPath = resolveRecipeOverlayHostPath({
      screen: args.screen,
      selectedCategory: args.recipeSelection.selectedCategory,
      currentLocationPath: stablePathname,
    });
    const presentationMode = resolveRecipePresentationMode(isUnifiedJourneyEnabled(recipe.id));
    const { snapshot, ingredientSelection: hydratedSelection } = hydratePlannedItemForRuntime({
      item,
      recipe,
      recipeContent: content,
      recipeV2,
    });

    args.recipeSelection.setIngredientSelectionByRecipe((prev) => ({
      ...prev,
      [recipe.id]: hydratedSelection,
    }));
    args.recipeSelection.setSelectedRecipe(recipe);
    args.recipeSelection.setSelectedCategory(recipe.categoryId);
    if (recipeV2) {
      args.recipeSelection.setTargetYield(resolvePersistedTargetYield(recipeV2, snapshot.targetYield));
      args.recipeSelection.setCookingContext(snapshot.cookingContext ?? recipeV2.cookingContextDefaults ?? null);
    } else {
      args.recipeSelection.setCookingContext(null);
      args.recipeSelection.setQuantityMode(snapshot.quantityMode);
      args.recipeSelection.setPeopleCount(snapshot.peopleCount ?? args.recipeSelection.selectedRecipe?.basePortions ?? 2);
      args.recipeSelection.setAmountUnit(snapshot.amountUnit ?? 'units');
      args.recipeSelection.setAvailableCount(snapshot.availableCount ?? 2);
      args.recipeSelection.setPortion(snapshot.resolvedPortion);
      args.cookingProgress.setTimerScaleFactor(snapshot.scaleFactor);
      args.cookingProgress.setTimingAdjustedLabel(
        Math.abs(snapshot.scaleFactor - 1) < 0.01
          ? 'Tiempo estándar'
          : `Tiempo ajustado x${snapshot.scaleFactor.toFixed(2)}`,
      );
    }
    if (recipeV2) {
      args.cookingProgress.setTimerScaleFactor(1);
      args.cookingProgress.setTimingAdjustedLabel('Tiempo resuelto por V2');
    }

    args.planning.setActivePlannedRecipeItemId(item.id);
    args.routeSyncRef.current = false;
    args.overlay.setRecipeOverlayHostScreen(resolveRecipeOverlayHostScreen(args.screen, args.overlay.recipeOverlayHostScreen));
    args.overlay.setRecipeOverlayHostPath(hostPath);

    if (targetScreen === 'cooking') {
      args.overlay.setRecipeOverlayPinnedPath(null);
      args.enterRecipeCookingRuntime({
        recipe,
        recipeV2,
        compatOptions: {
          content,
          activeIngredientSelection: hydratedSelection,
          quantityMode: snapshot.quantityMode,
          amountUnit: snapshot.amountUnit ?? 'units',
          availableCount: snapshot.availableCount ?? 2,
          peopleCount: snapshot.peopleCount ?? args.recipeSelection.selectedRecipe?.basePortions ?? 2,
          portion: snapshot.resolvedPortion,
          scaleFactor: snapshot.scaleFactor,
          timingLabel: Math.abs(snapshot.scaleFactor - 1) < 0.01
            ? 'Tiempo estándar'
            : `Tiempo ajustado x${snapshot.scaleFactor.toFixed(2)}`,
        },
      });
      args.navigate(cookingPath);
      return;
    }

    args.overlay.setRecipeOverlayPinnedPath(presentationMode === 'journey-page' ? null : setupPath);
    if (presentationMode === 'journey-page') {
      args.overlay.clearRecipeOverlaySheets();
    } else {
      args.overlay.openRecipeSetupSheet();
    }
    args.navigate(setupPath);
  };

  const openJourneyStageFromCooking = (stage: 'setup' | 'ingredients') => {
    const recipeId = args.recipeSelection.selectedRecipe?.id;
    if (!recipeId || !isUnifiedJourneyEnabled(recipeId)) {
      return false;
    }

    args.overlay.clearRecipeOverlaySheets();
    args.navigate(buildRecipeJourneyPath(recipeId, stage));
    return true;
  };

  return {
    applyPlannedRecipeSnapshot,
    openJourneyStageFromCooking,
  };
}
