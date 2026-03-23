import type { MutableRefObject } from 'react';
import type { Recipe, Screen } from '../../../../types';
import { buildSavedRecipeSummary, deriveRecipeSetupBehavior } from '../../../lib/recipeSetupBehavior';
import { resolveRecipeOverlayHostScreen } from '../../../lib/recipeOverlayHostScreen';
import { resolveRecipeOverlayHostPath, resolveRecipePresentationMode } from '../../../lib/recipeNavigation';
import { resolveRoutableCategoryId } from '../../../lib/routableRecipeCategory';
import { resolvePersistedTargetYield } from '../../../lib/recipe-v2/resolvePersistedTargetYield';
import { isUnifiedJourneyEnabled } from '../../../features/recipe-journey/compat/isUnifiedJourneyEnabled';
import { buildInitialIngredientSelection, getIngredientKey, mapCountToPortion } from '../../../utils/recipeHelpers';
import type {
  OverlayController,
  PlanningController,
  RecipeSelectionController,
  RuntimeHydratedRecipeSelection,
  UserRecipeConfigsController,
} from '../lib/controllerTypes';

export type HydratedRecipeSelectionResult = NonNullable<RuntimeHydratedRecipeSelection> & {
  recipe: Recipe;
};

type UseThermomixRecipeSelectionHydrationArgs = {
  screen: Screen;
  pathname: string;
  navigate: (path: string) => void;
  routeSyncRef: MutableRefObject<boolean>;
  recipeSelection: RecipeSelectionController;
  userRecipeConfigs: UserRecipeConfigsController;
  overlay: OverlayController;
  planning: PlanningController;
  beforeOpenRecipe?: () => void;
};

export function useThermomixRecipeSelectionHydration(args: UseThermomixRecipeSelectionHydrationArgs) {
  const selectedRecipeSavedConfig = args.recipeSelection.selectedRecipe
    ? args.userRecipeConfigs.configsByRecipeId[args.recipeSelection.selectedRecipe.id] ?? null
    : null;
  const selectedRecipeSetupBehavior = deriveRecipeSetupBehavior(
    args.recipeSelection.selectedRecipe,
    args.recipeSelection.activeRecipeContent,
    selectedRecipeSavedConfig,
  );
  const selectedRecipeSavedSummary = buildSavedRecipeSummary(selectedRecipeSavedConfig);

  const hydrateRecipeSelection = (recipe: Recipe): HydratedRecipeSelectionResult => {
    const content = args.recipeSelection.recipeContentById[recipe.id] ?? null;
    const recipeV2 = args.recipeSelection.recipeV2ById[recipe.id] ?? null;
    const hydratedRecipe =
      recipe.experience === 'compound' || recipeV2?.experience === 'compound' || Boolean(content?.compoundMeta)
        ? { ...recipe, experience: 'compound' as const }
        : recipe;
    const savedConfig = args.userRecipeConfigs.configsByRecipeId[recipe.id] ?? null;
    const setupBehavior = deriveRecipeSetupBehavior(hydratedRecipe, content, savedConfig);
    const resolvedCategoryId = resolveRoutableCategoryId(hydratedRecipe.categoryId);

    if (content && !args.recipeSelection.ingredientSelectionByRecipe[recipe.id]) {
      const baseSelection = buildInitialIngredientSelection(content.ingredients);
      const optionalKeys = savedConfig?.selectedOptionalIngredients ?? null;
      const hydratedSelection = optionalKeys
        ? Object.fromEntries(
          Object.entries(baseSelection).map(([key]) => {
            const ingredient = content.ingredients.find((item) => getIngredientKey(item.name) === key);
            if (ingredient?.indispensable) return [key, true];
            return [key, optionalKeys.includes(key)];
          }),
        )
        : baseSelection;
      args.recipeSelection.setIngredientSelectionByRecipe((prev) => ({
        ...prev,
        [recipe.id]: hydratedSelection,
      }));
    }

    args.recipeSelection.setSelectedRecipe(hydratedRecipe);
    args.recipeSelection.setSelectedCategory(resolvedCategoryId);
    if (recipeV2) {
      args.recipeSelection.setTargetYield(resolvePersistedTargetYield(recipeV2, savedConfig?.targetYield));
      args.recipeSelection.setCookingContext(savedConfig?.cookingContext ?? recipeV2.cookingContextDefaults ?? null);
      if (!args.recipeSelection.ingredientSelectionByRecipe[recipe.id]) {
        args.recipeSelection.setIngredientSelectionByRecipe((prev) => ({
          ...prev,
          [recipe.id]: Object.fromEntries(recipeV2.ingredients.map((ingredient) => [ingredient.id, true])),
        }));
      }
    } else {
      args.recipeSelection.setCookingContext(null);
    }

    const resolvedQuantityMode =
      savedConfig && (setupBehavior === 'saved_config_first' || setupBehavior === 'servings_or_quantity')
        ? (setupBehavior !== 'servings_only' && savedConfig.quantityMode === 'have' ? 'have' : 'people')
        : 'people';
    const resolvedPeopleCount = savedConfig?.peopleCount ?? hydratedRecipe.basePortions ?? 2;
    const resolvedAvailableCount = savedConfig?.availableCount ?? 2;
    const resolvedAmountUnit = savedConfig?.amountUnit ?? 'units';

    if (savedConfig && (setupBehavior === 'saved_config_first' || setupBehavior === 'servings_or_quantity')) {
      args.recipeSelection.setQuantityMode(resolvedQuantityMode);
      args.recipeSelection.setPeopleCount(resolvedPeopleCount);
      args.recipeSelection.setAvailableCount(resolvedAvailableCount);
      args.recipeSelection.setAmountUnit(resolvedAmountUnit);
    } else {
      args.recipeSelection.setQuantityMode('people');
      args.recipeSelection.setPeopleCount(hydratedRecipe.basePortions ?? 2);
      args.recipeSelection.setAvailableCount(2);
      args.recipeSelection.setAmountUnit('units');
    }

    const resolvedPortion = resolvedQuantityMode === 'people'
      ? mapCountToPortion(resolvedPeopleCount)
      : mapCountToPortion(
        resolvedAmountUnit === 'grams'
          ? Math.max(1, Math.round(resolvedAvailableCount / 250))
          : resolvedAvailableCount,
      );
    args.recipeSelection.setPortion(resolvedPortion);

    return {
      content,
      hydratedSelection: content
        ? (args.recipeSelection.ingredientSelectionByRecipe[recipe.id] ?? buildInitialIngredientSelection(content.ingredients))
        : {},
      quantityMode: resolvedQuantityMode,
      peopleCount: resolvedPeopleCount,
      amountUnit: resolvedAmountUnit,
      availableCount: resolvedAvailableCount,
      portion: resolvedPortion,
      recipeV2,
      recipe: hydratedRecipe,
    };
  };

  const handleRecipeOpen = (recipe: Recipe) => {
    const setupPath = `/recetas/${encodeURIComponent(recipe.id)}/configurar`;
    const normalizedLocationPath = args.pathname.replace(/\/+$/, '') || '/';
    const hostPath = resolveRecipeOverlayHostPath({
      screen: args.screen,
      selectedCategory: args.recipeSelection.selectedCategory,
      currentLocationPath: normalizedLocationPath,
    });
    const presentationMode = resolveRecipePresentationMode(isUnifiedJourneyEnabled(recipe.id));
    args.routeSyncRef.current = false;
    args.planning.setActivePlannedRecipeItemId(null);
    hydrateRecipeSelection(recipe);
    args.overlay.setRecipeOverlayHostScreen(resolveRecipeOverlayHostScreen(args.screen, args.overlay.recipeOverlayHostScreen));
    args.overlay.setRecipeOverlayHostPath(hostPath);
    args.overlay.setRecipeOverlayPinnedPath(presentationMode === 'journey-page' ? null : setupPath);
    args.beforeOpenRecipe?.();
    if (presentationMode === 'journey-page') {
      args.overlay.clearRecipeOverlaySheets();
    } else {
      args.overlay.openRecipeSetupSheet();
    }
    args.navigate(setupPath);
  };

  return {
    selectedRecipeSavedConfig,
    selectedRecipeSetupBehavior,
    selectedRecipeSavedSummary,
    hydrateRecipeSelection,
    handleRecipeOpen,
  };
}
