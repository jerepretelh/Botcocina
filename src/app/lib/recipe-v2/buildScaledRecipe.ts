import type { CookingContextV2, RecipeV2, RecipeYieldV2, ScaledRecipeV2 } from '../../types/recipe-v2';
import { describeMissingContainerScale, getContainerBatchContextFactor, getYieldScaleFactor, resolveBatchCooking } from './containerScaling';
import { scaleIngredients } from './scaleIngredients';
import { scaleStepTimers } from './scaleStepTimers';
import { scaleTimeSummary } from './scaleTimeSummary';

export function buildScaledRecipe(
  recipe: RecipeV2,
  targetYield: RecipeYieldV2,
  cookingContext?: CookingContextV2 | null,
): ScaledRecipeV2 {
  const resolvedCookingContext = cookingContext ?? recipe.cookingContextDefaults ?? null;
  const batchResolution = resolveBatchCooking(recipe, targetYield, resolvedCookingContext);
  const containerScaleWarning = describeMissingContainerScale(recipe.baseYield, targetYield);
  const containerContext = getContainerBatchContextFactor(recipe, resolvedCookingContext);
  const scaleFactor = getYieldScaleFactor(recipe.baseYield, targetYield);
  const timerScaleFactor = batchResolution.batchCount > 1
    ? batchResolution.perBatchScaleFactor
    : scaleFactor;
  const scaledIngredients = scaleIngredients(recipe.ingredients, recipe.baseYield, targetYield, {
    cookingContext: resolvedCookingContext,
  });
  const scaledSteps = scaleStepTimers(recipe.steps, recipe.baseYield, targetYield, {
    recipe,
    cookingContext: resolvedCookingContext,
    timerScaleFactor,
  });
  const timeSummary = scaleTimeSummary(recipe, targetYield, timerScaleFactor);
  const resolvedTimeSummary = batchResolution.batchCount > 1
    ? {
        ...timeSummary,
        cookMinutes: timeSummary.cookMinutes == null ? null : timeSummary.cookMinutes * batchResolution.batchCount,
        totalMinutes:
          timeSummary.totalMinutes == null
            ? null
            : (timeSummary.prepMinutes ?? 0) + ((timeSummary.cookMinutes ?? 0) * batchResolution.batchCount),
      }
    : timeSummary;

  return {
    ...recipe,
    selectedYield: targetYield,
    selectedCookingContext: resolvedCookingContext,
    scaleFactor,
    batchResolution,
    ingredients: scaledIngredients.ingredients,
    steps: scaledSteps.steps,
    timeSummary: resolvedTimeSummary,
    warnings: [
      ...new Set([
        ...scaledSteps.warnings,
        ...(containerScaleWarning ? [containerScaleWarning] : []),
        ...(containerContext.containerReferenceMissing ? [containerContext.containerReferenceMessage ?? ''] : []),
        ...(batchResolution.batchCount > 1 ? [`Esta receta se cocinará en ${batchResolution.batchCount} tandas.`] : []),
      ]),
    ],
  };
}
