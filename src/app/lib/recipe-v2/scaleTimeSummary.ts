import type { RecipeTimeSummaryV2, RecipeYieldV2, RecipeV2 } from '../../types/recipe-v2';
import { getYieldScaleFactor } from './containerScaling';

function scaleMinutes(value: number | null, factor: number, mode: 'prep' | 'cook') {
  if (value == null) return null;
  const applied = mode === 'prep'
    ? value * (1 + ((factor - 1) * 0.3))
    : value * (1 + ((factor - 1) * 0.45));
  return Math.max(1, Math.round(applied));
}

export function scaleTimeSummary(recipe: RecipeV2, targetYield: RecipeYieldV2, timerScaleFactor?: number): RecipeTimeSummaryV2 {
  const factor = timerScaleFactor ?? getYieldScaleFactor(recipe.baseYield, targetYield);
  const prepMinutes = scaleMinutes(recipe.timeSummary.prepMinutes, factor, 'prep');
  const cookMinutes = scaleMinutes(recipe.timeSummary.cookMinutes, factor, 'cook');
  return {
    prepMinutes,
    cookMinutes,
    totalMinutes: prepMinutes != null || cookMinutes != null
      ? (prepMinutes ?? 0) + (cookMinutes ?? 0)
      : null,
  };
}
