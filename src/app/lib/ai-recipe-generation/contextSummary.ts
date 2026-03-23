import type { AIRecipeContextDraft, RecipeSeed, SavedRecipeContextSummary } from '../../types';
import type { RecipeYieldV2 } from '../../types/recipe-v2';

export function buildContextSummary(
  context: AIRecipeContextDraft,
  options: {
    quantityMode: 'people' | 'have';
    peopleCount: number | null;
    amountUnit: 'units' | 'grams' | null;
    availableCount: number | null;
    targetYield?: RecipeYieldV2 | null;
    selectedSeed?: RecipeSeed | null;
  },
): SavedRecipeContextSummary | null {
  const availableIngredients = context.availableIngredients.map((item) => item.value.trim()).filter(Boolean);
  const avoidIngredients = context.avoidIngredients.map((item) => item.value.trim()).filter(Boolean);
  const prompt = context.prompt.trim();
  if (!prompt && !context.servings && availableIngredients.length === 0 && avoidIngredients.length === 0 && !options.selectedSeed) {
    return null;
  }

  const summaryLabel =
    options.quantityMode === 'have' && options.availableCount
      ? `Basada en ${options.availableCount}${options.amountUnit === 'grams' ? ' g' : ' unid.'}`
      : options.peopleCount
        ? `Creada para ${options.peopleCount} persona${options.peopleCount === 1 ? '' : 's'}`
        : null;

  return {
    prompt: prompt || null,
    servings: context.servings,
    quantityMode: options.quantityMode,
    amountUnit: options.amountUnit,
    availableCount: options.availableCount,
    targetYield: options.targetYield ?? null,
    availableIngredients,
    avoidIngredients,
    summaryLabel,
    seedId: options.selectedSeed?.id ?? null,
    seedName: options.selectedSeed?.name ?? null,
    seedCategoryId: options.selectedSeed?.categoryId ?? null,
  };
}
