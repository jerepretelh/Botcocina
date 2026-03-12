import type {
  Recipe,
  RecipeContent,
  RecipeSetupBehavior,
  SavedRecipeContextSummary,
  UserRecipeCookingConfig,
} from '../../types';
import { normalizeText } from '../utils/recipeHelpers';

const QUANTITY_CAPABLE_PHRASES = [
  'huevo frito',
  'huevos fritos',
  'huevo sancochado',
  'huevos sancochados',
  'papas fritas',
  'papa frita',
  'camote frito',
  'camotes fritos',
  'patacones',
  'tostones',
  'milanesa',
  'milanesas',
  'nugget',
  'nuggets',
  'alita',
  'alitas',
  'filete',
  'filetes',
  'trozo',
  'trozos',
  'pieza',
  'piezas',
];

const QUANTITY_CAPABLE_INGREDIENT_HINTS = [
  'huevo',
  'huevos',
  'papa',
  'papas',
  'camote',
  'camotes',
  'filete',
  'filetes',
  'pieza',
  'piezas',
  'trozo',
  'trozos',
  'milanesa',
  'milanesas',
  'nugget',
  'nuggets',
];

const COMPOUND_RECIPE_HINTS = [
  'macarron',
  'macarrones',
  'queso',
  'pasta',
  'fideo',
  'espagueti',
  'spaghetti',
  'arroz con',
  'arroz ',
  'sopa',
  'guiso',
  'estofado',
  'ensalada',
  'salteado',
  'tortilla de verduras',
  'lomo saltado',
  'postre',
  'lasana',
  'lasaña',
  'tallarin',
  'tallarines',
];

function hasHint(haystack: string, hints: string[]): boolean {
  return hints.some((hint) => haystack.includes(hint));
}

export function supportsIngredientBaseFromText(text: string | null | undefined): boolean {
  const haystack = normalizeText(text ?? '');
  if (!haystack.trim()) return false;

  const hasPositiveSignal =
    hasHint(haystack, QUANTITY_CAPABLE_PHRASES) ||
    hasHint(haystack, QUANTITY_CAPABLE_INGREDIENT_HINTS);

  if (!hasPositiveSignal) return false;

  const hasCompoundSignal = hasHint(haystack, COMPOUND_RECIPE_HINTS);
  if (hasCompoundSignal) return false;

  return true;
}

export function supportsIngredientBaseFromRecipe(recipe: Recipe | null, content: RecipeContent | null): boolean {
  if (!recipe || !content) return false;

  const ingredientLabel = normalizeText(recipe.ingredient ?? '');
  if (ingredientLabel.includes('porcion')) return false;
  if (
    ingredientLabel.includes('huevo') ||
    ingredientLabel.includes('papa') ||
    ingredientLabel.includes('camote') ||
    ingredientLabel.includes('pieza') ||
    ingredientLabel.includes('filete') ||
    ingredientLabel.includes('trozo')
  ) {
    return true;
  }

  const haystack = normalizeText(
    `${recipe.id} ${recipe.name} ${recipe.ingredient} ${content.ingredients.map((item) => item.name).join(' ')} ${content.steps.map((step) => step.stepName).join(' ')}`,
  );

  return supportsIngredientBaseFromText(haystack);
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
