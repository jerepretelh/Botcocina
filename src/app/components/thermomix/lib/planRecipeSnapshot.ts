import type { WeeklyPlanItemConfigSnapshot } from '../../../../types';
import { getIngredientKey } from '../../../utils/recipeHelpers';

type BuildPlanRecipeSnapshotArgs = {
  quantityMode: WeeklyPlanItemConfigSnapshot['quantityMode'];
  peopleCount: number;
  amountUnit: WeeklyPlanItemConfigSnapshot['amountUnit'];
  availableCount: number;
  targetYield: WeeklyPlanItemConfigSnapshot['targetYield'];
  cookingContext: WeeklyPlanItemConfigSnapshot['cookingContext'];
  selectedOptionalIngredients: string[];
  sourceContextSummary: WeeklyPlanItemConfigSnapshot['sourceContextSummary'];
  resolvedPortion: WeeklyPlanItemConfigSnapshot['resolvedPortion'];
  scaleFactor: number;
};

export function buildPlanRecipeSnapshot(args: BuildPlanRecipeSnapshotArgs): WeeklyPlanItemConfigSnapshot {
  return {
    quantityMode: args.quantityMode,
    peopleCount: args.peopleCount,
    amountUnit: args.quantityMode === 'have' ? args.amountUnit : null,
    availableCount: args.quantityMode === 'have' ? args.availableCount : null,
    targetYield: args.targetYield,
    cookingContext: args.cookingContext,
    selectedOptionalIngredients: [...args.selectedOptionalIngredients],
    sourceContextSummary: args.sourceContextSummary ?? null,
    resolvedPortion: args.resolvedPortion,
    scaleFactor: args.scaleFactor,
  };
}

export function resolveSelectedOptionalIngredientKeys(
  ingredients: Array<{ name: string; indispensable?: boolean }>,
  activeIngredientSelection: Record<string, boolean>,
): string[] {
  return ingredients
    .filter((ingredient) => !ingredient.indispensable)
    .map((ingredient) => getIngredientKey(ingredient.name))
    .filter((key) => activeIngredientSelection[key] ?? true);
}

