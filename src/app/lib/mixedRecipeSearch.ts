import type { MixedRecipeSearchResult, Recipe, RecipeCategory, RecipeSeed } from '../../types';
import { normalizeText } from '../utils/recipeHelpers';

function buildScore(name: string, description: string, aliases: string[], query: string): number {
  if (!query) return 0;

  const normalizedName = normalizeText(name);
  const normalizedDescription = normalizeText(description);
  const normalizedAliases = aliases.map((alias) => normalizeText(alias));
  const haystack = [normalizedName, ...normalizedAliases, normalizedDescription].join(' ');

  if (!haystack.includes(query)) return -1;

  let score = 0;

  if (normalizedName === query) score += 120;
  if (normalizedName.startsWith(query)) score += 72;
  if (normalizedName.split(/\s+/).some((token) => token.startsWith(query))) score += 36;
  if (normalizedAliases.some((alias) => alias === query)) score += 28;
  if (normalizedAliases.some((alias) => alias.includes(query))) score += 18;
  if (normalizedDescription.includes(query)) score += 10;

  return score;
}

function buildRecipeDescription(recipe: Recipe, categoryLabel: string): string {
  const description = recipe.description?.trim();
  if (description) return description;
  return `Receta ${categoryLabel.toLowerCase()} lista para abrir y cocinar.`;
}

function buildSeedDescription(seed: RecipeSeed, categoryLabel: string): string {
  const description = seed.shortDescription?.trim();
  if (description) return description;
  return `Idea base de ${categoryLabel.toLowerCase()} para arrancar una receta guiada con IA.`;
}

export function buildMixedRecipeSearchResults({
  query,
  recipes,
  seeds,
  categories,
  limit = 8,
}: {
  query: string;
  recipes: Recipe[];
  seeds: RecipeSeed[];
  categories: RecipeCategory[];
  limit?: number;
}): MixedRecipeSearchResult[] {
  const normalizedQuery = normalizeText(query).trim();
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const recipeResults = recipes
    .map((recipe) => {
      const category = categoryById.get(recipe.categoryId);
      const categoryLabel = category?.name ?? recipe.categoryId;
      const categoryIcon = category?.icon ?? recipe.icon ?? '🍽️';
      const description = buildRecipeDescription(recipe, categoryLabel);
      const score = normalizedQuery
        ? buildScore(recipe.name, description, [recipe.ingredient, categoryLabel, recipe.categoryId], normalizedQuery)
        : 0;

      if (normalizedQuery && score < 0) return null;

      return {
        item: {
          id: `recipe:${recipe.id}`,
          kind: 'recipe' as const,
          title: recipe.name,
          description,
          categoryLabel,
          categoryIcon,
          metaLabel: recipe.visibility === 'private' ? 'Mi receta' : 'Global',
          actionLabel: 'Abrir',
          highlightableText: `${recipe.name} ${description} ${recipe.ingredient} ${categoryLabel}`,
          recipe,
        },
        score,
      };
    })
    .filter((entry): entry is { item: MixedRecipeSearchResult; score: number } => Boolean(entry));

  const seedResults = seeds
    .map((seed) => {
      const category = categoryById.get(seed.categoryId);
      const categoryLabel = category?.name ?? seed.categoryId;
      const categoryIcon = category?.icon ?? '✨';
      const description = buildSeedDescription(seed, categoryLabel);
      const score = normalizedQuery
        ? buildScore(seed.name, description, seed.searchTerms, normalizedQuery)
        : 0;

      if (normalizedQuery && score < 0) return null;

      return {
        item: {
          id: `seed:${seed.id}`,
          kind: 'seed' as const,
          title: seed.name,
          description,
          categoryLabel,
          categoryIcon,
          metaLabel: 'Idea IA',
          actionLabel: 'Crear con IA',
          highlightableText: `${seed.name} ${description} ${seed.searchTerms.join(' ')} ${categoryLabel}`,
          seed,
        },
        score,
      };
    })
    .filter((entry): entry is { item: MixedRecipeSearchResult; score: number } => Boolean(entry));

  const merged = [...recipeResults, ...seedResults];

  if (!normalizedQuery) {
    return merged
      .sort((a, b) => a.item.kind.localeCompare(b.item.kind) || a.item.title.localeCompare(b.item.title))
      .slice(0, limit)
      .map((entry) => entry.item);
  }

  return merged
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((entry) => entry.item);
}
