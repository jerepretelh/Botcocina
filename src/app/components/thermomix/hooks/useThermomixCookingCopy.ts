import { useMemo } from 'react';
import { resolveSubStepDisplayValue } from '../../../lib/recipeScaling';
import {
  resolveAutoReminderState,
  resolveCookingPortionValue,
  resolveReminderCopy,
} from '../lib/cookingAssembly';
import type { CookingProgressController, PortionsController, RecipeSelectionController } from '../lib/controllerTypes';

export function useThermomixCookingCopy(args: {
  cookingProgress: CookingProgressController;
  recipeSelection: RecipeSelectionController;
  portions: PortionsController;
}) {
  const reminderState = useMemo(
    () => resolveAutoReminderState(args.cookingProgress.currentSubStep),
    [args.cookingProgress.currentSubStep],
  );

  const reminderCopy = useMemo(
    () => resolveReminderCopy({
      currentSubStep: args.cookingProgress.currentSubStep,
      currentSubStepText: reminderState.currentSubStepText,
      isAutoReminderSubStep: reminderState.isAutoReminderSubStep,
      selectedRecipeId: args.recipeSelection.selectedRecipe?.id ?? null,
    }),
    [args.cookingProgress.currentSubStep, args.recipeSelection.selectedRecipe?.id, reminderState.currentSubStepText, reminderState.isAutoReminderSubStep],
  );

  const rawResolvedSubStepValue = args.cookingProgress.currentSubStep
    ? resolveSubStepDisplayValue({
      subStep: args.cookingProgress.currentSubStep,
      recipe: args.recipeSelection.selectedRecipe,
      content: args.recipeSelection.activeRecipeContent,
      portion: args.recipeSelection.portion,
      peopleCount: args.recipeSelection.peopleCount,
      quantityMode: args.recipeSelection.quantityMode,
    })
    : null;

  const portionValue = useMemo(
    () => resolveCookingPortionValue({
      rawResolvedSubStepValue,
      currentSubStep: args.cookingProgress.currentSubStep,
      setupScaleFactor: args.portions.setupScaleFactor,
    }),
    [args.cookingProgress.currentSubStep, args.portions.setupScaleFactor, rawResolvedSubStepValue],
  );

  return {
    reminderState,
    reminderCopy,
    portionValue,
  };
}
