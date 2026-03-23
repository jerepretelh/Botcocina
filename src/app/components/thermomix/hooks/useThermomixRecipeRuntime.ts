import { resolvePersistedTargetYield } from '../../../lib/recipe-v2/resolvePersistedTargetYield';
import { isCanonicalRecipeV2 } from '../../../lib/recipe-v2/canonicalRecipeV2';
import { isUnifiedJourneyEnabled } from '../../../features/recipe-journey/compat/isUnifiedJourneyEnabled';
import { useCompoundCookingSessionV2 } from '../../../hooks/useCompoundCookingSessionV2';
import { useRecipeYield } from '../../../hooks/useRecipeYield';
import { useScaledRecipe } from '../../../hooks/useScaledRecipe';
import { useCookingProgressV2 } from '../../../hooks/useCookingProgressV2';
import { useThermomixTimerV2 } from '../../../hooks/useThermomixTimerV2';
import type { CookingProgressController, RecipeSelectionController } from '../lib/controllerTypes';

export function useThermomixRecipeRuntime(args: {
  screen: string;
  recipeSelection: RecipeSelectionController;
  cookingProgress: CookingProgressController;
}) {
  const currentRecipeV2 = args.recipeSelection.selectedRecipeV2;
  const compoundMeta = args.recipeSelection.activeRecipeContent.compoundMeta ?? currentRecipeV2?.compoundMeta ?? null;
  const isCompoundRecipe = (
    args.recipeSelection.selectedRecipe?.experience === 'compound'
    || currentRecipeV2?.experience === 'compound'
  ) && Boolean(compoundMeta);
  const canonicalRecipeV2 = currentRecipeV2 && isCanonicalRecipeV2(currentRecipeV2) ? currentRecipeV2 : null;
  const isUnifiedJourneyRecipe = isUnifiedJourneyEnabled(args.recipeSelection.selectedRecipe?.id);
  const setupRecipeV2 = isUnifiedJourneyRecipe ? currentRecipeV2 : !isCompoundRecipe ? currentRecipeV2 : null;
  const hasSetupRecipeV2 = Boolean(setupRecipeV2);
  const hasRecipeV2 = Boolean(canonicalRecipeV2);
  const standardRecipeV2 = !isCompoundRecipe ? canonicalRecipeV2 : null;
  const compoundRecipeV2 = isCompoundRecipe ? currentRecipeV2 : null;

  const standardYield = useRecipeYield({
    recipe: setupRecipeV2,
    initialTargetYield: setupRecipeV2 && args.recipeSelection.targetYield?.type === setupRecipeV2.baseYield.type
      ? args.recipeSelection.targetYield
      : setupRecipeV2?.baseYield ?? null,
  });
  const compoundTargetYield = compoundRecipeV2 ? resolvePersistedTargetYield(compoundRecipeV2, args.recipeSelection.targetYield) : null;
  const scaledStandardRecipe = useScaledRecipe({ recipe: standardRecipeV2, targetYield: standardYield.selectedYield, cookingContext: args.recipeSelection.cookingContext, requireCanonical: true });
  const scaledJourneyRecipe = useScaledRecipe({ recipe: setupRecipeV2, targetYield: standardYield.selectedYield, cookingContext: args.recipeSelection.cookingContext });
  const scaledCompoundRecipe = useScaledRecipe({ recipe: compoundRecipeV2, targetYield: compoundTargetYield, cookingContext: args.recipeSelection.cookingContext, requireCanonical: true });
  const standardCooking = useCookingProgressV2({ recipe: scaledStandardRecipe });
  const standardTimer = useThermomixTimerV2({ currentSubStep: standardCooking.currentSubStep, active: args.screen === 'cooking' && Boolean(canonicalRecipeV2 && scaledStandardRecipe) });
  const compoundCooking = useCompoundCookingSessionV2({ selectedRecipe: args.recipeSelection.selectedRecipe, scaledRecipe: scaledCompoundRecipe, screen: args.screen });
  const cookingFlowFinished = isCompoundRecipe ? compoundCooking.isRecipeComplete : hasRecipeV2 ? standardCooking.isRecipeFinished : args.cookingProgress.isRecipeFinished;

  return {
    currentRecipeV2,
    isCompoundRecipe,
    canonicalRecipeV2,
    isUnifiedJourneyRecipe,
    setupRecipeV2,
    hasSetupRecipeV2,
    hasRecipeV2,
    scaledStandardRecipe,
    scaledJourneyRecipe,
    scaledCompoundRecipe,
    standardYield,
    standardCooking,
    standardTimer,
    compoundCooking,
    cookingFlowFinished,
  };
}
