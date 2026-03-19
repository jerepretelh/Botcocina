import type { Recipe, RecipeContent } from '../../../types';
import type { RecipeV2 } from '../../types/recipe-v2';
import { normalizeLegacyRecipeToV2 as normalizeLegacyRecipeToV2Core } from '../recipeV2';

export function normalizeLegacyRecipeToV2(recipe: Recipe, content: RecipeContent): RecipeV2 {
  return normalizeLegacyRecipeToV2Core(recipe, content);
}
