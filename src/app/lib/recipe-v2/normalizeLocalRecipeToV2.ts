import type { RecipeV2 } from '../../types/recipe-v2';
import { validateRecipeV2 } from './validateRecipeV2';

export function normalizeLocalRecipeToV2(recipe: RecipeV2): RecipeV2 {
  return validateRecipeV2(recipe);
}
