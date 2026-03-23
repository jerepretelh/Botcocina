import { useState } from 'react';
import type { Recipe, Screen, WeeklyPlanItem, WeeklyPlanItemConfigSnapshot } from '../../../../types';

export function usePlanningController() {
  const [planningRecipe, setPlanningRecipe] = useState<Recipe | null>(null);
  const [editingPlanItem, setEditingPlanItem] = useState<WeeklyPlanItem | null>(null);
  const [planningInitialSnapshot, setPlanningInitialSnapshot] = useState<WeeklyPlanItemConfigSnapshot | null>(null);
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);
  const [planSheetSourceScreen, setPlanSheetSourceScreen] = useState<Screen | null>(null);
  const [activePlannedRecipeItemId, setActivePlannedRecipeItemId] = useState<string | null>(null);

  const closePlanSheet = () => {
    setIsPlanSheetOpen(false);
    setPlanningRecipe(null);
    setEditingPlanItem(null);
    setPlanningInitialSnapshot(null);
    setPlanSheetSourceScreen(null);
  };

  const openPlanSheetForRecipe = (
    recipe: Recipe,
    currentScreen: Screen,
    planItem: WeeklyPlanItem | null = null,
    snapshotOverride: WeeklyPlanItemConfigSnapshot | null = null,
  ) => {
    setPlanningRecipe(recipe);
    setEditingPlanItem(planItem);
    setPlanningInitialSnapshot(snapshotOverride);
    setPlanSheetSourceScreen(currentScreen);
    setIsPlanSheetOpen(true);
  };

  return {
    planningRecipe,
    editingPlanItem,
    planningInitialSnapshot,
    isPlanSheetOpen,
    planSheetSourceScreen,
    activePlannedRecipeItemId,
    setActivePlannedRecipeItemId,
    setIsPlanSheetOpen,
    closePlanSheet,
    openPlanSheetForRecipe,
  };
}

