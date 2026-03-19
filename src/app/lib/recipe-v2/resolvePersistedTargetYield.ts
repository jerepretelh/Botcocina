import type { RecipeV2, RecipeYieldV2 } from '../../types/recipe-v2';
import { normalizeTargetYield } from './resolveTargetYield';

export function resolvePersistedTargetYield(recipeV2: RecipeV2, targetYield: RecipeYieldV2 | null | undefined): RecipeYieldV2 {
  if (!targetYield || targetYield.type !== recipeV2.baseYield.type) {
    return recipeV2.baseYield;
  }
  if (!Number.isFinite(targetYield.value) || targetYield.value <= 0) {
    return recipeV2.baseYield;
  }

  const normalized = normalizeTargetYield(recipeV2, targetYield);
  if (normalized.type !== recipeV2.baseYield.type || !Number.isFinite(normalized.value) || normalized.value <= 0) {
    return recipeV2.baseYield;
  }

  return normalized;
}
