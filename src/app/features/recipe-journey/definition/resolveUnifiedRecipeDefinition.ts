import type { RecipeV2 } from '../../../types/recipe-v2';
import type { UnifiedRecipeDefinition } from '../types';
import { fromRecipeV2 } from './adapters/fromRecipeV2';

interface ResolveUnifiedRecipeDefinitionArgs {
  recipeV2: RecipeV2 | null;
}

export function resolveUnifiedRecipeDefinition({
  recipeV2,
}: ResolveUnifiedRecipeDefinitionArgs): UnifiedRecipeDefinition | null {
  if (!recipeV2) return null;
  return fromRecipeV2(recipeV2);
}
