import { useEffect, useMemo, useState } from 'react';
import type { RecipeV2, RecipeYieldV2 } from '../types/recipe-v2';
import { adjustTargetYield, describeYieldValue, normalizeTargetYield } from '../lib/recipe-v2/resolveTargetYield';

interface UseRecipeYieldArgs {
  recipe: RecipeV2 | null;
  initialTargetYield?: RecipeYieldV2 | null;
}

export function useRecipeYield({ recipe, initialTargetYield }: UseRecipeYieldArgs) {
  const baseYield = recipe?.baseYield ?? null;
  const [selectedYield, setSelectedYield] = useState<RecipeYieldV2 | null>(
    recipe ? normalizeTargetYield(recipe, initialTargetYield ?? recipe.baseYield) : null,
  );

  useEffect(() => {
    if (!recipe) {
      setSelectedYield(null);
      return;
    }
    setSelectedYield(normalizeTargetYield(recipe, initialTargetYield ?? recipe.baseYield));
  }, [
    recipe?.id,
    initialTargetYield?.type,
    initialTargetYield?.unit,
    initialTargetYield?.label,
    initialTargetYield?.value,
    initialTargetYield?.visibleUnit,
    initialTargetYield?.canonicalUnit,
    initialTargetYield?.containerKey,
    initialTargetYield?.containerMeta?.capacityMl,
    initialTargetYield?.containerMeta?.diameterCm,
  ]);

  const describedYield = useMemo(() => {
    return describeYieldValue(selectedYield);
  }, [selectedYield]);

  return {
    baseYield,
    selectedYield,
    setSelectedYield: (nextYield: RecipeYieldV2) => {
      if (!recipe) return;
      setSelectedYield(normalizeTargetYield(recipe, nextYield));
    },
    incrementYield: () => {
      if (!recipe || !selectedYield) return;
      setSelectedYield(adjustTargetYield(recipe, selectedYield, 1));
    },
    decrementYield: () => {
      if (!recipe || !selectedYield) return;
      setSelectedYield(adjustTargetYield(recipe, selectedYield, -1));
    },
    describedYield,
  };
}
