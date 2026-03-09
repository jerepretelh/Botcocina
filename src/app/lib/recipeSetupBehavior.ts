import type {
  Recipe,
  RecipeContent,
  RecipeSetupBehavior,
  SavedRecipeContextSummary,
  UserRecipeCookingConfig,
} from '../../types';
import { normalizeText } from '../utils/recipeHelpers';

function supportsIngredientBaseFromRecipe(recipe: Recipe | null, content: RecipeContent | null): boolean {
  if (!recipe || !content) return false;
  const haystack = normalizeText(
    `${recipe.id} ${recipe.name} ${recipe.ingredient} ${content.ingredients.map((item) => item.name).join(' ')} ${content.steps.map((step) => step.stepName).join(' ')}`,
  );

  return (
    haystack.includes('huevo') ||
    haystack.includes('papa') ||
    haystack.includes('camote') ||
    haystack.includes('freir') ||
    haystack.includes('frita') ||
    haystack.includes('frito') ||
    haystack.includes('sancoch') ||
    haystack.includes('herv')
  );
}

export function deriveRecipeSetupBehavior(
  recipe: Recipe | null,
  content: RecipeContent | null,
  savedConfig: UserRecipeCookingConfig | null,
): RecipeSetupBehavior {
  if (!recipe || !content) return 'servings_only';

  const supportsIngredientBase =
    savedConfig?.quantityMode === 'have' ||
    savedConfig?.sourceContextSummary?.quantityMode === 'have' ||
    supportsIngredientBaseFromRecipe(recipe, content);

  if (recipe.visibility === 'private' && recipe.ownerUserId) {
    return supportsIngredientBase ? 'saved_config_first' : 'servings_only';
  }

  return supportsIngredientBase ? 'servings_or_quantity' : 'servings_only';
}

export function buildSavedRecipeSummary(config: UserRecipeCookingConfig | null): SavedRecipeContextSummary | null {
  return config?.sourceContextSummary ?? null;
}
