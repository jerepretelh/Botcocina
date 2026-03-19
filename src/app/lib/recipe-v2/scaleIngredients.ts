import type {
  CookingContextV2,
  IngredientAmountV2,
  RecipeIngredientV2,
  RecipeYieldV2,
  ScaledRecipeIngredientV2,
  ScaledAmountV2,
  ScalingPolicy,
} from '../../types/recipe-v2';
import { getYieldScaleFactor } from './containerScaling';
import { formatScaledStructuredAmount } from './measurements';

function scaleValue(value: number, factor: number, policy: ScalingPolicy) {
  switch (policy) {
    case 'fixed':
    case 'non_scalable':
      return value;
    case 'gentle':
      return value * (1 + ((factor - 1) * 0.6));
    case 'batch':
      return Math.ceil(value * factor);
    case 'container_dependent':
      return value * (1 + ((factor - 1) * 0.8));
    case 'linear':
    default:
      return value * factor;
  }
}

function formatNumber(value: number) {
  if (value >= 10) return `${Math.round(value * 10) / 10}`.replace(/\.0$/, '');
  return `${Math.round(value * 100) / 100}`.replace(/\.0$/, '').replace(/(\.\d)0$/, '$1');
}

export function formatScaledAmount(amount: IngredientAmountV2, factor: number): string {
  if (amount.text && (!amount.scalable || amount.scalingPolicy === 'non_scalable')) {
    return amount.text;
  }
  if (amount.value == null) {
    return amount.text ?? 'Al gusto';
  }
  const scaledValue = scaleValue(amount.value, factor, amount.scalingPolicy);
  return formatScaledStructuredAmount(amount, scaledValue);
}

function buildScaledAmount(amount: IngredientAmountV2, factor: number, containerMeta?: CookingContextV2['selectedContainerMeta']): ScaledAmountV2 {
  const scaledValue = amount.value == null ? null : scaleValue(amount.value, factor, amount.scalingPolicy);
  return {
    ...amount,
    scaledValue,
    scaledCanonicalUnit: amount.canonicalUnit,
    displayText: formatScaledStructuredAmount(amount, scaledValue, containerMeta ?? undefined),
  };
}

export function scaleIngredients(
  ingredients: RecipeIngredientV2[],
  baseYield: RecipeYieldV2,
  targetYield: RecipeYieldV2,
  options?: {
    cookingContext?: CookingContextV2 | null;
  },
): { ingredients: ScaledRecipeIngredientV2[]; scaleFactor: number } {
  const scaleFactor = getYieldScaleFactor(baseYield, targetYield);
  return {
    scaleFactor,
    ingredients: ingredients.map((ingredient) => {
      const scaledAmount = buildScaledAmount(ingredient.amount, scaleFactor, options?.cookingContext?.selectedContainerMeta);
      return {
        ...ingredient,
        scaledAmount,
        displayAmount: scaledAmount.displayText,
      };
    }),
  };
}
