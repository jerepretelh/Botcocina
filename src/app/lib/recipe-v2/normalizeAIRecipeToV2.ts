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
        value: ingredient.baseValue ? Number.parseFloat(String(ingredient.baseValue)) || null : null,
        unit: null,
        text: ingredient.baseValue ?? ingredient.portions?.[2] ?? null,
        scalable: true,
        scalingPolicy: 'linear',
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
          value: typeof subStep.baseValue === 'number' ? subStep.baseValue : null,
          unit: null,
          text: typeof subStep.baseValue === 'string' ? subStep.baseValue : null,
          scalable: true,
          scalingPolicy: 'linear',
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
