import { AmountUnit, Ingredient, Portion, QuantityMode, Recipe, RecipeStep, StepLoopState } from '../../types';
import {
  buildCookingSteps,
  buildEggFrySteps,
  ensureEquipmentTransitionSubSteps,
  getLoopItemCount,
  hasExplicitUnitFlow,
  isLoopableStep,
  removeRedundantEggInsertSubStep,
} from '../utils/recipeHelpers';
import { applyTimerScale } from '../utils/timerUtils';

interface BuildCookingSessionArgs {
  selectedRecipe: Recipe | null;
  activeRecipeContentSteps: RecipeStep[];
  currentIngredients: Ingredient[];
  activeIngredientSelection: Record<string, boolean>;
  quantityMode: QuantityMode;
  amountUnit: AmountUnit;
  availableCount: number;
  peopleCount: number;
  portion: Portion;
  timerScaleFactor: number;
}

export function buildCookingSessionState({
  selectedRecipe,
  activeRecipeContentSteps,
  currentIngredients,
  activeIngredientSelection,
  quantityMode,
  amountUnit,
  availableCount,
  peopleCount,
  portion,
  timerScaleFactor,
}: BuildCookingSessionArgs): { steps: RecipeStep[]; activeStepLoop: StepLoopState | null } {
  const eggTargetCount = quantityMode === 'have'
    ? (amountUnit === 'grams'
      ? Math.max(1, Math.round(availableCount / 55))
      : availableCount)
    : peopleCount;
  const sourceSteps = selectedRecipe?.id === 'huevo-frito'
    ? buildEggFrySteps(eggTargetCount)
    : activeRecipeContentSteps;

  let steps = removeRedundantEggInsertSubStep(
    ensureEquipmentTransitionSubSteps(
      buildCookingSteps(sourceSteps, currentIngredients, activeIngredientSelection),
      selectedRecipe?.equipment,
    ),
    selectedRecipe?.id,
  );

  if (timerScaleFactor !== 1) {
    steps = applyTimerScale(steps, timerScaleFactor);
  }

  const loopItems = selectedRecipe?.id === 'papas-fritas' ? 3 : getLoopItemCount(currentIngredients, portion);
  const shouldDisableLoop = selectedRecipe?.id === 'huevo-frito' || hasExplicitUnitFlow(steps);
  const loopStepIndex = !shouldDisableLoop && loopItems > 1
    ? steps.findIndex((step) => isLoopableStep(step))
    : -1;

  return {
    steps,
    activeStepLoop: loopStepIndex >= 0
      ? {
        stepIndex: loopStepIndex,
        totalItems: loopItems,
        currentItem: 1,
      }
      : null,
  };
}
