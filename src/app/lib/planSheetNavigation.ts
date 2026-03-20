import type { Screen } from '../../types';

interface ShouldClosePlanSheetArgs {
  screen: Screen;
  sourceScreen: Screen | null;
  planningRecipeId: string | null;
  selectedRecipeId: string | null;
}

export function shouldClosePlanSheet(args: ShouldClosePlanSheetArgs): boolean {
  const { screen, sourceScreen, planningRecipeId, selectedRecipeId } = args;

  if (sourceScreen && screen !== sourceScreen) {
    return true;
  }

  if (
    screen === 'cooking' &&
    planningRecipeId &&
    selectedRecipeId &&
    selectedRecipeId !== planningRecipeId
  ) {
    return true;
  }

  return false;
}
