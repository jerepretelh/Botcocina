import type { Recipe } from '../../../../types';
import type { RecipeV2 } from '../../../types/recipe-v2';
import type { CookRuntimeBridgePayload } from '../types';

interface CreateCookRuntimeEntryAdapterArgs {
  selectedRecipe: Recipe | null;
  recipeV2ById: Record<string, RecipeV2 | null | undefined>;
  hasRecipeV2: boolean;
  setTargetYield: (yieldValue: CookRuntimeBridgePayload['selectedYield']) => void;
  setCookingContext: (context: CookRuntimeBridgePayload['selectedCookingContext']) => void;
  setIngredientSelectionByRecipe: (
    updater: (
      previous: Record<string, Record<string, boolean>>,
    ) => Record<string, Record<string, boolean>>,
  ) => void;
  enterCompoundCookingRuntime: () => void;
  enterStandardCookingRuntime: () => void;
  startCompatCooking: () => void;
  navigateToCookingRoute: (recipeId: string) => void;
}

export function createCookRuntimeEntryAdapter({
  selectedRecipe,
  recipeV2ById,
  hasRecipeV2,
  setTargetYield,
  setCookingContext,
  setIngredientSelectionByRecipe,
  enterCompoundCookingRuntime,
  enterStandardCookingRuntime,
  startCompatCooking,
  navigateToCookingRoute,
}: CreateCookRuntimeEntryAdapterArgs) {
  return {
    enterCookRuntime: (payload?: CookRuntimeBridgePayload) => {
      if (payload?.selectedYield !== undefined) {
        setTargetYield(payload.selectedYield ?? null);
      }

      if (payload?.selectedCookingContext !== undefined) {
        setCookingContext(payload.selectedCookingContext ?? null);
      }

      if (payload?.selectedIngredientIds && selectedRecipe?.id) {
        const recipeId = selectedRecipe.id;
        const recipeV2 = recipeV2ById[recipeId] ?? null;
        if (recipeV2) {
          const nextSelection = Object.fromEntries(
            recipeV2.ingredients.map((ingredient) => [
              ingredient.id,
              ingredient.indispensable || payload.selectedIngredientIds.includes(ingredient.id),
            ]),
          );
          setIngredientSelectionByRecipe((previous) => ({
            ...previous,
            [recipeId]: nextSelection,
          }));
        }
      }

      if ((payload?.flowType === 'compound' || selectedRecipe?.experience === 'compound') && selectedRecipe) {
        enterCompoundCookingRuntime();
      } else if (hasRecipeV2) {
        enterStandardCookingRuntime();
      } else {
        startCompatCooking();
      }

      if (selectedRecipe?.id) {
        navigateToCookingRoute(selectedRecipe.id);
      }
    },
  };
}
