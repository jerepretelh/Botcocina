import type { FixedRecipeJson } from './types';

export interface LibraryCategoryOption {
  key: string;
  label: string;
}

export interface LibrarySearchIndex {
  title: string;
  recipeCategoryLabel: string;
  ingredientNames: string[];
  ingredientCanonicalNames: string[];
  equipment: string[];
}

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveRecipeCategoryKey(recipe: FixedRecipeJson): string {
  return recipe.recipeCategory ?? 'other';
}

export function buildLibraryCategoryOptions(input: {
  recipes: FixedRecipeJson[];
  formatCategoryLabel: (category: FixedRecipeJson['recipeCategory'] | undefined) => string;
}): LibraryCategoryOption[] {
  const map = new Map<string, string>();
  input.recipes.forEach((recipe) => {
    const key = resolveRecipeCategoryKey(recipe);
    if (map.has(key)) return;
    map.set(key, input.formatCategoryLabel(recipe.recipeCategory));
  });

  const dynamic = Array.from(map.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));

  return [{ key: 'all', label: 'Todas' }, ...dynamic];
}

export function buildLibrarySearchIndex(
  recipe: FixedRecipeJson,
  formatCategoryLabel: (category: FixedRecipeJson['recipeCategory'] | undefined) => string,
): LibrarySearchIndex {
  return {
    title: recipe.title,
    recipeCategoryLabel: formatCategoryLabel(recipe.recipeCategory),
    ingredientNames: recipe.ingredients.flatMap((group) => group.items.map((item) => item.name)),
    ingredientCanonicalNames: recipe.ingredients.flatMap((group) => group.items.map((item) => item.canonicalName)),
    equipment: recipe.equipment ?? [],
  };
}

export function filterLibraryRecipes(input: {
  recipes: FixedRecipeJson[];
  query: string;
  activeCategoryKey: string;
  formatCategoryLabel: (category: FixedRecipeJson['recipeCategory'] | undefined) => string;
}): FixedRecipeJson[] {
  const normalizedQuery = normalizeSearchText(input.query);

  return input.recipes.filter((recipe) => {
    if (input.activeCategoryKey !== 'all' && resolveRecipeCategoryKey(recipe) !== input.activeCategoryKey) {
      return false;
    }
    if (!normalizedQuery) return true;

    const index = buildLibrarySearchIndex(recipe, input.formatCategoryLabel);
    const haystack = [
      index.title,
      index.recipeCategoryLabel,
      ...index.ingredientNames,
      ...index.ingredientCanonicalNames,
      ...index.equipment,
    ]
      .map(normalizeSearchText)
      .join(' ');

    return haystack.includes(normalizedQuery);
  });
}
