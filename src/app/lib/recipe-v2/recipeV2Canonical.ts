import type { CookingContextV2, RecipeV2 } from '../../types/recipe-v2';
import type { RecipeYieldType, RecipeYieldV2 } from '../../types/recipe-v2';

const VALID_YIELD_TYPES: Set<RecipeYieldType> = new Set([
  'servings',
  'units',
  'weight',
  'volume',
  'pan_size',
  'tray_size',
  'custom',
]);

export interface RecipeV2Canonical extends RecipeV2 {
  __isCanonicalV2: true;
}

function isPositiveYieldValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function isRecipeV2Canonical(recipe: unknown): recipe is RecipeV2Canonical {
  return Boolean(recipe && typeof recipe === 'object' && (recipe as RecipeV2Canonical).__isCanonicalV2 === true);
}

export function normalizeToCanonicalRecipeV2(
  recipe: RecipeV2,
  options?: {
    targetYield?: RecipeYieldV2 | null;
    cookingContext?: CookingContextV2 | null;
  },
): RecipeV2Canonical {
  if (!recipe || typeof recipe !== 'object') {
    throw new Error('La receta V2 no es un objeto válido.');
  }

  if (!recipe.id || typeof recipe.id !== 'string') {
    throw new Error('La receta V2 debe incluir id.');
  }

  if (!recipe.name || typeof recipe.name !== 'string') {
    throw new Error('La receta V2 debe incluir name.');
  }

  const baseYield = recipe.baseYield as unknown as RecipeYieldV2;
  if (!baseYield || typeof baseYield !== 'object') {
    throw new Error('La receta V2 no incluye baseYield.');
  }

  if (!VALID_YIELD_TYPES.has(baseYield.type)) {
    throw new Error('La receta V2 tiene un tipo de rendimiento inválido.');
  }

  if (!isPositiveYieldValue(baseYield.value)) {
    throw new Error('La receta V2 debe tener un rendimiento base positivo.');
  }

  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    throw new Error('La receta V2 debe incluir ingredientes.');
  }

  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) {
    throw new Error('La receta V2 debe incluir pasos.');
  }

  const invalidIngredient = recipe.ingredients.find((ingredient) => !ingredient?.name || !ingredient.id);
  if (invalidIngredient) {
    throw new Error('Un ingrediente de la receta V2 no es válido.');
  }

  const invalidStep = recipe.steps.find((step) => !step?.id || !step.title);
  if (invalidStep) {
    throw new Error('Un paso de la receta V2 no es válido.');
  }

  if (options?.targetYield) {
    const targetYield = options.targetYield;
    if (!VALID_YIELD_TYPES.has(targetYield.type) || !isPositiveYieldValue(targetYield.value)) {
      throw new Error('El targetYield de la receta IA debe ser válido.');
    }
  }

  const resolvedCookingContext =
    options?.cookingContext !== undefined
      ? options.cookingContext
      : recipe.cookingContextDefaults ?? null;

  if (resolvedCookingContext !== null && typeof resolvedCookingContext !== 'object') {
    throw new Error('El cookingContext de la receta V2 no es válido.');
  }

  return {
    ...recipe,
    cookingContextDefaults: resolvedCookingContext,
    __isCanonicalV2: true,
  };
}
