import type { Recipe, RecipeCategory, RecipeContent } from '../src/types';
import { initialRecipeContent, recipeCategories as legacyRecipeCategories, recipes as legacyRecipes } from '../src/app/data/recipes';
import { recipeCategories as v2RecipeCategories } from '../src/app/data/recipeCategories';
import { localRecipesV2 } from '../src/app/data/recipes.v2';
import { buildRecipeV2PersistenceShape, buildResolvedLegacyContentFromScaledRecipe, scaleRecipeV2 } from '../src/app/lib/recipeV2';

type PublicationRecipeEntry = {
  recipe: Recipe;
  content: RecipeContent;
  source: 'legacy' | 'v2';
  persistence: ReturnType<typeof buildRecipeV2PersistenceShape> | null;
};

type PublicationCatalog = {
  categories: RecipeCategory[];
  entries: PublicationRecipeEntry[];
};

function derivePortionLabels(recipeId: string, content: RecipeContent) {
  const singular = content.portionLabels?.singular?.trim();
  const plural = content.portionLabels?.plural?.trim();
  if (singular && plural) {
    return { singular, plural };
  }

  const baseYield = localRecipesV2.find((recipe) => recipe.id === recipeId)?.baseYield;
  const baseLabel = baseYield?.label?.trim() || baseYield?.unit?.trim() || 'porciones';
  if (baseYield?.type === 'servings') {
    return {
      singular: singular || 'porción',
      plural: plural || baseLabel || 'porciones',
    };
  }

  return {
    singular: singular || baseLabel,
    plural: plural || baseLabel,
  };
}

function recipeFromV2(recipeId: string): PublicationRecipeEntry | null {
  const recipeV2 = localRecipesV2.find((recipe) => recipe.id === recipeId);
  if (!recipeV2) return null;

  const scaled = scaleRecipeV2(recipeV2, recipeV2.baseYield);
  const content = buildResolvedLegacyContentFromScaledRecipe(scaled);
  const labels = derivePortionLabels(recipeId, content);

  return {
    recipe: {
      id: recipeV2.id,
      categoryId: recipeV2.categoryId as Recipe['categoryId'],
      name: recipeV2.name,
      icon: recipeV2.icon ?? '🍽️',
      emoji: recipeV2.icon ?? '🍽️',
      ingredient: recipeV2.ingredient ?? labels.plural,
      description: recipeV2.description ?? 'Receta publicada desde catálogo V2.',
      experience: recipeV2.experience === 'compound' ? 'compound' : undefined,
    },
    content: {
      ...content,
      tip: recipeV2.tip ?? content.tip,
      portionLabels: labels,
      compoundMeta: recipeV2.compoundMeta ?? content.compoundMeta,
    },
    source: 'v2',
    persistence: buildRecipeV2PersistenceShape(recipeV2),
  };
}

function buildCategoryCatalog(entries: PublicationRecipeEntry[]): RecipeCategory[] {
  const categoryMap = new Map<string, RecipeCategory>();

  for (const category of legacyRecipeCategories) {
    categoryMap.set(category.id, category);
  }

  for (const category of v2RecipeCategories) {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      icon: category.icon,
      description: category.description ?? `Categoría ${category.name}`,
    });
  }

  for (const entry of entries) {
    if (categoryMap.has(entry.recipe.categoryId)) continue;
    categoryMap.set(entry.recipe.categoryId, {
      id: entry.recipe.categoryId,
      name: entry.recipe.categoryId,
      icon: '🍽️',
      description: `Categoría ${entry.recipe.categoryId}`,
    });
  }

  const usedCategoryIds = new Set(entries.map((entry) => entry.recipe.categoryId));
  return [...categoryMap.values()].filter((category) => usedCategoryIds.has(category.id));
}

export function buildPublicationCatalog(): PublicationCatalog {
  const entriesById = new Map<string, PublicationRecipeEntry>();

  for (const legacyRecipe of legacyRecipes) {
    const legacyContent = initialRecipeContent[legacyRecipe.id];
    if (!legacyContent) continue;

    entriesById.set(legacyRecipe.id, {
      recipe: legacyRecipe,
      content: legacyContent,
      source: 'legacy',
      persistence: null,
    });
  }

  for (const recipeV2 of localRecipesV2.filter((recipe) => recipe.isCoreRecipe)) {
    const entry = recipeFromV2(recipeV2.id);
    if (!entry) continue;
    entriesById.set(recipeV2.id, entry);
  }

  const entries = [...entriesById.values()].sort((left, right) => left.recipe.name.localeCompare(right.recipe.name));
  return {
    categories: buildCategoryCatalog(entries),
    entries,
  };
}
