import type { Recipe, RecipeContent } from '../../types';
import { getIngredientKey, normalizeText } from '../../utils/recipeHelpers';

export function buildRecipeEquivalenceSignature(
  recipe: Pick<Recipe, 'name' | 'ingredient'>,
  content: Pick<RecipeContent, 'ingredients' | 'steps' | 'baseServings'>,
): string {
  const ingredientSignature = content.ingredients
    .map((ingredient) => getIngredientKey(ingredient.name))
    .filter(Boolean)
    .sort()
    .join('|');
  const stepSignature = content.steps
    .map((step) => normalizeText(`${step.stepName} ${step.subSteps.map((subStep) => subStep.subStepName).join(' ')}`))
    .filter(Boolean)
    .join('|');

  return [
    normalizeText(recipe.name || ''),
    normalizeText(recipe.ingredient || ''),
    String(content.baseServings ?? ''),
    ingredientSignature,
    stepSignature,
  ].join('::');
}
