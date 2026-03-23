import type { Recipe } from '../../../../types';
import type { RecipeYieldV2 } from '../../../types/recipe-v2';
import { getIngredientKey, normalizeText } from '../../../utils/recipeHelpers';

export const APPROX_GRAMS_PER_UNIT = 250;

export const COMPOUND_DEMO_IDS = new Set([
  'arroz-lentejas-compuesto',
  'tallarines-rojos-compuesto',
]);

export const COMPOUND_DEMO_FALLBACKS: Recipe[] = [
  {
    id: 'arroz-lentejas-compuesto',
    categoryId: 'arroces',
    name: 'Arroz con lentejas',
    icon: '🍛',
    emoji: '🍛',
    ingredient: 'Porciones',
    description: 'Fases guiadas · 45-55 min',
    experience: 'compound',
  },
  {
    id: 'tallarines-rojos-compuesto',
    categoryId: 'almuerzos',
    name: 'Tallarines rojos coordinados',
    icon: '🍝',
    emoji: '🍝',
    ingredient: 'Porciones',
    description: 'Salsa + pasta · flujo compuesto',
    experience: 'compound',
  },
];

export function dedupeRecipesById(recipes: Recipe[]): Recipe[] {
  const byId = new Map<string, Recipe>();
  for (const recipe of recipes) {
    byId.set(recipe.id, recipe);
  }
  return [...byId.values()];
}

export function buildRecipeSignature(
  recipe: Recipe,
  content?: {
    ingredients: Array<{ name: string }>;
    steps: Array<{ stepName: string; subSteps: Array<{ subStepName: string }> }>;
  } | null,
): string {
  const ingredientSignature = (content?.ingredients ?? [])
    .map((ingredient) => getIngredientKey(ingredient.name))
    .filter(Boolean)
    .sort()
    .join('|');
  const stepSignature = (content?.steps ?? [])
    .map((step) => normalizeText(`${step.stepName} ${step.subSteps.map((subStep) => subStep.subStepName).join(' ')}`))
    .filter(Boolean)
    .join('|');

  return [
    recipe.ownerUserId ?? '',
    recipe.visibility ?? 'public',
    normalizeText(recipe.name),
    normalizeText(recipe.ingredient),
    ingredientSignature,
    stepSignature,
  ].join('::');
}

export function dedupeRecipesBySignature(
  recipes: Recipe[],
  recipeContentById: Record<
    string,
    { ingredients: Array<{ name: string }>; steps: Array<{ stepName: string; subSteps: Array<{ subStepName: string }> }> }
  >,
): Recipe[] {
  const bySignature = new Map<string, Recipe>();
  for (const recipe of recipes) {
    const signature = buildRecipeSignature(recipe, recipeContentById[recipe.id]);
    const existing = bySignature.get(signature);
    if (!existing) {
      bySignature.set(signature, recipe);
      continue;
    }
    const existingUpdatedAt = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
    const nextUpdatedAt = recipe.updatedAt ? new Date(recipe.updatedAt).getTime() : 0;
    if (nextUpdatedAt >= existingUpdatedAt) {
      bySignature.set(signature, recipe);
    }
  }
  return [...bySignature.values()];
}

export function areRecipeYieldsEqual(
  left: RecipeYieldV2 | null | undefined,
  right: RecipeYieldV2 | null | undefined,
): boolean {
  if (!left || !right) return left === right;

  return (
    left.type === right.type &&
    left.value === right.value &&
    (left.unit ?? null) === (right.unit ?? null) &&
    (left.label ?? null) === (right.label ?? null) &&
    (left.visibleUnit ?? null) === (right.visibleUnit ?? null) &&
    (left.canonicalUnit ?? null) === (right.canonicalUnit ?? null) &&
    (left.containerKey ?? null) === (right.containerKey ?? null) &&
    (left.containerMeta?.capacityMl ?? null) === (right.containerMeta?.capacityMl ?? null) &&
    (left.containerMeta?.diameterCm ?? null) === (right.containerMeta?.diameterCm ?? null) &&
    (left.containerMeta?.sizeLabel ?? null) === (right.containerMeta?.sizeLabel ?? null)
  );
}

export function getCompoundCookingStorageKey(recipeId: string, configSignature: string) {
  return `compound_cooking_progress_${recipeId}_${configSignature}`;
}

export function getCompoundSavedSessionState(
  recipeId: string,
  configSignature: string | null,
): { hasSnapshot: boolean; isRecipeComplete: boolean } {
  if (!configSignature) return { hasSnapshot: false, isRecipeComplete: false };
  try {
    const raw = localStorage.getItem(getCompoundCookingStorageKey(recipeId, configSignature));
    if (!raw) return { hasSnapshot: false, isRecipeComplete: false };
    const parsed = JSON.parse(raw) as { isRecipeComplete?: boolean };
    return {
      hasSnapshot: true,
      isRecipeComplete: Boolean(parsed.isRecipeComplete),
    };
  } catch {
    return { hasSnapshot: false, isRecipeComplete: false };
  }
}

