import type { Recipe, WeeklyPlanItem } from '../../types';

export interface ResolvedPlannedRecipeItem {
  recipe: Recipe | null;
  isResolvable: boolean;
  isUnresolvable: boolean;
}

export function resolvePlannedRecipeItem(
  item: WeeklyPlanItem,
  recipesById: ReadonlyMap<string, Recipe> | Record<string, Recipe>,
): ResolvedPlannedRecipeItem {
  if (!item.recipeId) {
    return {
      recipe: null,
      isResolvable: false,
      isUnresolvable: false,
    };
  }

  const recipe = recipesById instanceof Map
    ? recipesById.get(item.recipeId) ?? null
    : recipesById[item.recipeId] ?? null;

  return {
    recipe,
    isResolvable: Boolean(recipe),
    isUnresolvable: !recipe,
  };
}
