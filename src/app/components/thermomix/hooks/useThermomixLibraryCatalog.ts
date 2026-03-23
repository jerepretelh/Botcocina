import { useMemo } from 'react';
import { matchesRecipeCategory } from '../../../lib/recipeCategoryMapping';
import { buildMixedRecipeSearchResults } from '../../../lib/mixedRecipeSearch';
import { recipeCategories } from '../../../data/recipeCategories';
import { dedupeRecipesById, dedupeRecipesBySignature } from '../lib/runtimeHelpers';
import type {
  GlobalCategoryEntry,
  GlobalCategoryItem,
  RecipeSeedsController,
  RecipeSelectionController,
  UserFavoritesController,
} from '../lib/controllerTypes';
import type { Recipe } from '../../../../types';

type UseThermomixLibraryCatalogArgs = {
  authUserId: string | null;
  recipeSeedSearchTerm: string;
  recipeSelection: RecipeSelectionController;
  userFavorites: UserFavoritesController;
  recipeSeeds: RecipeSeedsController;
};

export function useThermomixLibraryCatalog(args: UseThermomixLibraryCatalogArgs) {
  const uniqueAvailableRecipes = useMemo(
    () => dedupeRecipesById(args.recipeSelection.availableRecipes),
    [args.recipeSelection.availableRecipes],
  );

  const publicLocalV2LibraryRecipes = useMemo(() => {
    const existingRecipeIds = new Set(uniqueAvailableRecipes.map((recipe) => recipe.id));

    return Object.values(args.recipeSelection.recipeV2ById)
      .filter((recipeV2) => recipeV2.isCoreRecipe)
      .filter((recipeV2) => !existingRecipeIds.has(recipeV2.id))
      .filter((recipeV2) => Boolean(recipeV2.categoryId))
      .map((recipeV2): Recipe => ({
        id: recipeV2.id,
        categoryId: recipeV2.categoryId,
        name: recipeV2.name,
        icon: recipeV2.icon ?? '🍳',
        ingredient: recipeV2.ingredient ?? 'receta',
        description: recipeV2.description ?? 'Receta disponible',
        experience: recipeV2.experience,
        visibility: 'public',
      }));
  }, [args.recipeSelection.recipeV2ById, uniqueAvailableRecipes]);

  const publicRecipes = useMemo(
    () => [
      ...uniqueAvailableRecipes.filter((recipe) => (recipe.visibility ?? 'public') === 'public'),
      ...publicLocalV2LibraryRecipes,
    ],
    [publicLocalV2LibraryRecipes, uniqueAvailableRecipes],
  );

  const selectableRecipesById = useMemo(
    () => new Map(publicRecipes.map((recipe) => [recipe.id, recipe])),
    [publicRecipes],
  );

  const runtimeRecipesById = useMemo(() => {
    const map = new Map<string, Recipe>();
    for (const recipe of uniqueAvailableRecipes) {
      map.set(recipe.id, recipe);
    }
    for (const recipe of publicLocalV2LibraryRecipes) {
      if (!map.has(recipe.id)) {
        map.set(recipe.id, recipe);
      }
    }
    return map;
  }, [publicLocalV2LibraryRecipes, uniqueAvailableRecipes]);

  const globalCategories = useMemo<GlobalCategoryEntry[]>(
    () => [
      {
        category: {
          id: 'all',
          name: 'Todas',
          icon: '📚',
          description: 'Todas las recetas públicas disponibles en la fuente actual.',
        },
        recipeCount: publicRecipes.length,
      },
      ...recipeCategories
        .filter((category) => category.id !== 'personalizadas')
        .map((category) => ({
          category,
          recipeCount: publicRecipes.filter((recipe) => matchesRecipeCategory(category.id, recipe.categoryId)).length,
        }))
        .filter((entry) => entry.recipeCount > 0),
    ],
    [publicRecipes],
  );

  const globalCategoryItems = useMemo<GlobalCategoryItem[]>(() => {
    const toSortedItems = (recipes: Recipe[]) =>
      recipes
        .map((recipe) => ({ id: `recipe:${recipe.id}`, kind: 'recipe' as const, recipe }))
        .sort((a, b) => a.recipe.name.localeCompare(b.recipe.name));

    if (!args.recipeSelection.selectedCategory) {
      return toSortedItems(publicRecipes);
    }

    return toSortedItems(
      publicRecipes.filter((recipe) => matchesRecipeCategory(args.recipeSelection.selectedCategory, recipe.categoryId)),
    );
  }, [args.recipeSelection.selectedCategory, publicRecipes]);

  const privateUserRecipes = useMemo(
    () => dedupeRecipesBySignature(
      uniqueAvailableRecipes
        .filter((recipe) => recipe.ownerUserId === args.authUserId && (recipe.visibility ?? 'public') === 'private')
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        }),
      args.recipeSelection.recipeContentById,
    ),
    [args.authUserId, args.recipeSelection.recipeContentById, uniqueAvailableRecipes],
  );

  const recentPrivateRecipes = useMemo(() => privateUserRecipes.slice(0, 4), [privateUserRecipes]);

  const mixedSearchResults = useMemo(
    () =>
      buildMixedRecipeSearchResults({
        query: args.recipeSeedSearchTerm,
        recipes: uniqueAvailableRecipes,
        seeds: args.recipeSeeds.seeds,
        categories: recipeCategories,
        limit: args.recipeSeedSearchTerm.trim() ? 8 : 10,
      }),
    [args.recipeSeedSearchTerm, args.recipeSeeds.seeds, uniqueAvailableRecipes],
  );

  const favoriteRecipes = useMemo(
    () => dedupeRecipesBySignature(
      uniqueAvailableRecipes.filter((recipe) => args.userFavorites.favoriteRecipeIds.has(recipe.id)),
      args.recipeSelection.recipeContentById,
    ),
    [args.recipeSelection.recipeContentById, uniqueAvailableRecipes, args.userFavorites.favoriteRecipeIds],
  );

  return {
    uniqueAvailableRecipes,
    publicRecipes,
    selectableRecipesById,
    runtimeRecipesById,
    globalCategories,
    globalCategoryItems,
    privateUserRecipes,
    recentPrivateRecipes,
    mixedSearchResults,
    favoriteRecipes,
  };
}
