import type { RecipeV2 } from '../../types/recipe-v2';

export function validateRecipeV2(recipe: unknown): RecipeV2 {
  if (!recipe || typeof recipe !== 'object') {
    throw new Error('La receta V2 no es un objeto válido.');
  }

  const candidate = recipe as Partial<RecipeV2>;
  if (!candidate.id || !candidate.name) {
    throw new Error('La receta V2 debe incluir id y name.');
  }
  if (!candidate.baseYield || !candidate.steps || !candidate.ingredients) {
    throw new Error(`La receta V2 "${candidate.id}" no tiene baseYield, ingredients o steps.`);
  }

  return candidate as RecipeV2;
}
