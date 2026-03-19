import { mapCountToPortion } from '../utils/recipeHelpers';
import type { RecipeV2, RecipeYieldV2 } from '../types/recipe-v2';
import type { AmountUnit, Portion, QuantityMode, WeeklyPlanItemConfigSnapshot } from '../../types';

type LegacyPlanCompat = Pick<
  WeeklyPlanItemConfigSnapshot,
  'quantityMode' | 'peopleCount' | 'amountUnit' | 'availableCount' | 'resolvedPortion' | 'scaleFactor'
>;

function computeScaleFactor(baseYield: RecipeYieldV2, targetYield: RecipeYieldV2): number {
  if (baseYield.type !== targetYield.type) return 1;
  if (baseYield.value == null || targetYield.value == null) return 1;
  return Math.max(0.25, Math.min(4, targetYield.value / Math.max(baseYield.value, 0.01)));
}

function defaultPeopleCount(recipe?: RecipeV2 | null): number {
  if (recipe?.baseYield.type === 'servings' && recipe.baseYield.value != null) {
    return Math.max(1, Math.round(recipe.baseYield.value));
  }
  return 2;
}

export function deriveLegacyPlanCompatFromTargetYield(
  targetYield: RecipeYieldV2 | null | undefined,
  recipe?: RecipeV2 | null,
): LegacyPlanCompat {
  const nextTarget = targetYield ?? recipe?.baseYield ?? {
    type: 'servings' as const,
    value: 2,
    unit: 'porciones',
    label: 'porciones',
  };
  const baseYield = recipe?.baseYield ?? nextTarget;
  const basePeople = defaultPeopleCount(recipe);

  if (nextTarget.type === 'servings') {
    const peopleCount = Math.max(1, Math.round(nextTarget.value ?? baseYield.value ?? basePeople));
    const resolvedPortion = mapCountToPortion(peopleCount);
    return {
      quantityMode: 'people',
      peopleCount,
      amountUnit: null,
      availableCount: null,
      resolvedPortion,
      scaleFactor: computeScaleFactor(baseYield, nextTarget),
    };
  }

  const quantityMode: QuantityMode = 'have';
  const amountUnit: AmountUnit = nextTarget.type === 'weight' ? 'grams' : 'units';
  const availableCount = Math.max(
    amountUnit === 'grams' ? 50 : 1,
    Math.round(nextTarget.value ?? baseYield.value ?? (amountUnit === 'grams' ? 500 : 2)),
  );
  const resolvedPortion: Portion = mapCountToPortion(
    amountUnit === 'grams' ? Math.max(1, Math.round(availableCount / 250)) : availableCount,
  );

  return {
    quantityMode,
    peopleCount: basePeople,
    amountUnit,
    availableCount,
    resolvedPortion,
    scaleFactor: computeScaleFactor(baseYield, nextTarget),
  };
}
