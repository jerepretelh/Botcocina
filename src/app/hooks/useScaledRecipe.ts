import { useMemo } from 'react';
import type { CookingContextV2, RecipeV2, RecipeYieldV2 } from '../types/recipe-v2';
import { buildScaledRecipe } from '../lib/recipe-v2/buildScaledRecipe';
import { isCanonicalRecipeV2 } from '../lib/recipe-v2/canonicalRecipeV2';

interface UseScaledRecipeArgs {
  recipe: RecipeV2 | null;
  targetYield: RecipeYieldV2 | null;
  cookingContext?: CookingContextV2 | null;
  requireCanonical?: boolean;
}

export function useScaledRecipe({ recipe, targetYield, cookingContext, requireCanonical = false }: UseScaledRecipeArgs) {
  return useMemo(() => {
    if (!recipe || !targetYield) return null;
    if (requireCanonical && !isCanonicalRecipeV2(recipe)) {
      return null;
    }
    return buildScaledRecipe(recipe, targetYield, cookingContext);
  }, [recipe, targetYield, cookingContext, requireCanonical]);
}
