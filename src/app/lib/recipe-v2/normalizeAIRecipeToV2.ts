import type { GeneratedRecipe } from '../recipeAI';
import type { RecipeV2 } from '../../types/recipe-v2';
import { normalizeAIRecipeV2 } from '../recipeV2';
import { isVolumeAlias, normalizeStructuredAmount, normalizeYieldV2 } from './measurements';
import { ensureCanonicalRecipeV2, type CanonicalRecipeV2 } from './canonicalRecipeV2';

function inferAIYieldType(recipe: GeneratedRecipe['baseYield']): 'volume' | 'weight' | 'units' | 'servings' | 'pan_size' | 'tray_size' | 'custom' {
  if (!recipe?.type) return 'servings';
  return recipe.type;
}

function normalizeAIVolumeYieldFallback(baseYield: NonNullable<GeneratedRecipe['baseYield']>): NonNullable<GeneratedRecipe['baseYield']> {
  const inferredType = baseYield.type === 'volume' ? 'volume' : inferAIYieldType(baseYield);
  const rawUnit = baseYield.visibleUnit ?? baseYield.unit ?? baseYield.canonicalUnit ?? null;
  if (inferredType !== 'volume' && isVolumeAlias(rawUnit)) {
    return {
      ...baseYield,
      type: 'volume',
    };
  }
  if (inferredType === 'volume' && !baseYield.type) {
    return {
      ...baseYield,
      type: 'volume',
    };
  }
  return baseYield;
}

function buildLegacyAIFallbackAmount(value: string | number | null | undefined) {
  const text = value == null ? null : String(value);
  const inferredUnit = typeof value === 'string'
    ? value
      .trim()
      .toLowerCase()
      .match(/(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*([a-záéíóúñ]+)/)?.[1] ?? null
    : null;
  const parsedValue = typeof value === 'number'
    ? value
    : (typeof value === 'string' ? Number.parseFloat(value.replace(',', '.')) : null);
  const hasNumericValue = typeof parsedValue === 'number' && Number.isFinite(parsedValue);

  return normalizeStructuredAmount({
    value: hasNumericValue ? parsedValue : null,
    unit: hasNumericValue ? (inferredUnit ?? 'unidad') : null,
    text,
    scalable: hasNumericValue,
    scalingPolicy: hasNumericValue ? 'linear' : 'non_scalable',
    family: hasNumericValue ? undefined : 'custom',
    canonicalUnit: hasNumericValue ? undefined : null,
  });
}

export function normalizeAIRecipeToV2(recipe: GeneratedRecipe): CanonicalRecipeV2 {
  const baseYieldInput = recipe.baseYield ?? null;
  const normalizedBaseYield = baseYieldInput
    ? normalizeAIVolumeYieldFallback(baseYieldInput)
    : {
      type: 'servings' as const,
      value: recipe.baseServings ?? 2,
      unit: 'porciones',
      label: 'porciones',
    };

  return ensureCanonicalRecipeV2(normalizeAIRecipeV2({
    id: recipe.id,
    name: recipe.name,
    icon: recipe.icon,
    ingredient: recipe.ingredient,
    description: recipe.description,
    tip: recipe.tip,
    baseYield: normalizeYieldV2({
      ...normalizedBaseYield,
      ...(normalizedBaseYield.type === 'volume'
        ? {
          visibleUnit: normalizedBaseYield.visibleUnit ?? normalizedBaseYield.unit ?? 'ml',
          unit: normalizedBaseYield.unit ?? normalizedBaseYield.visibleUnit ?? 'ml',
        }
        : {
          visibleUnit: normalizedBaseYield.visibleUnit ?? normalizedBaseYield.unit ?? recipe.baseServings?.toString() ?? 'porciones',
          unit: normalizedBaseYield.unit ?? normalizedBaseYield.visibleUnit ?? recipe.baseServings?.toString() ?? 'porciones',
        }),
    }),
    ingredients: recipe.ingredients.map((ingredient) => ({
      name: ingredient.name,
      emoji: ingredient.emoji,
      indispensable: ingredient.indispensable,
      amount: normalizeStructuredAmount(ingredient.amount ?? {
        ...buildLegacyAIFallbackAmount(ingredient.baseValue ?? ingredient.portions?.[2] ?? null),
      }),
      notes: ingredient.notes,
    })),
    steps: recipe.steps.map((step) => ({
      title: step.title ?? step.stepName ?? 'Paso',
      fireLevel: step.fireLevel,
      temperature: step.temperature ?? null,
      equipment: step.equipment,
      notes: step.notes ?? null,
      subSteps: step.subSteps.map((subStep) => ({
        text: subStep.text ?? subStep.subStepName ?? 'Continuar',
        notes: subStep.notes ?? null,
        amount: subStep.amount ? normalizeStructuredAmount(subStep.amount) : (subStep.isTimer ? null : normalizeStructuredAmount({
          ...buildLegacyAIFallbackAmount(subStep.baseValue ?? subStep.portions?.[2] ?? null),
        })),
        timer: subStep.timer ?? (subStep.isTimer ? {
          durationSeconds: typeof subStep.baseValue === 'number' ? subStep.baseValue : null,
          scalingPolicy: subStep.timerScaling === 'fixed' ? 'fixed' : 'gentle',
        } : null),
      })),
    })),
    timeSummary: recipe.timeSummary ?? null,
    experience: recipe.experience,
    compoundMeta: recipe.compoundMeta as RecipeV2['compoundMeta'],
  }));
}
