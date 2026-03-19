import test from 'node:test';
import assert from 'node:assert/strict';

import { GLOBAL_RECIPES_ALL_PATH, GLOBAL_RECIPES_HOME_PATH, isGlobalRecipesAllPath } from '../lib/globalRecipesRoute';
import { resolveRecipeOverlayHostScreen } from '../lib/recipeOverlayHostScreen';
import { isRecipeOverlayRoute, resolveOverlayPinnedRoute } from '../lib/recipeOverlayRoute';
import { resolveRoutableCategoryId } from '../lib/routableRecipeCategory';

test('non-routable recipe category does not resolve to a selected category', () => {
  assert.equal(resolveRoutableCategoryId('airfryer'), null);
});

test('valid recipe category keeps selectedCategory routable', () => {
  assert.equal(resolveRoutableCategoryId('breakfast'), 'breakfast');
});

test('papas-airfryer resolves to null category so setup route does not bounce to home', () => {
  assert.equal(resolveRoutableCategoryId('airfryer'), null);
});

test('continuing from setup to ingredients keeps the pinned recipe route instead of falling back to home', () => {
  const result = resolveOverlayPinnedRoute({
    screen: 'category-select',
    recipeId: 'papas-airfryer',
    selectedCategory: null,
    isRecipeSetupSheetOpen: false,
    isIngredientsSheetOpen: true,
    recipeOverlayPinnedPath: '/recetas/papas-airfryer/ingredientes',
  });

  assert.equal(result, '/recetas/papas-airfryer/ingredientes');
});

test('all recipes view has its own stable route instead of collapsing to global home', () => {
  assert.equal(
    resolveOverlayPinnedRoute({
      screen: 'recipe-select',
      recipeId: null,
      selectedCategory: null,
      isRecipeSetupSheetOpen: false,
      isIngredientsSheetOpen: false,
      recipeOverlayPinnedPath: null,
    }),
    GLOBAL_RECIPES_ALL_PATH,
  );
  assert.equal(isGlobalRecipesAllPath(GLOBAL_RECIPES_ALL_PATH), true);
  assert.equal(isGlobalRecipesAllPath(GLOBAL_RECIPES_HOME_PATH), false);
});

test('all recipes to papas-airfryer to ingredients stays anchored to recipe routes', () => {
  const allRecipesPath = resolveOverlayPinnedRoute({
    screen: 'recipe-select',
    recipeId: null,
    selectedCategory: null,
    isRecipeSetupSheetOpen: false,
    isIngredientsSheetOpen: false,
    recipeOverlayPinnedPath: null,
  });
  assert.equal(allRecipesPath, GLOBAL_RECIPES_ALL_PATH);

  const setupPath = resolveOverlayPinnedRoute({
    screen: 'recipe-select',
    recipeId: 'papas-airfryer',
    selectedCategory: null,
    isRecipeSetupSheetOpen: true,
    isIngredientsSheetOpen: false,
    recipeOverlayPinnedPath: '/recetas/papas-airfryer/configurar',
  });
  assert.equal(setupPath, '/recetas/papas-airfryer/configurar');
  assert.equal(isRecipeOverlayRoute(setupPath), true);

  const ingredientsPath = resolveOverlayPinnedRoute({
    screen: 'recipe-select',
    recipeId: 'papas-airfryer',
    selectedCategory: null,
    isRecipeSetupSheetOpen: false,
    isIngredientsSheetOpen: true,
    recipeOverlayPinnedPath: '/recetas/papas-airfryer/ingredientes',
  });
  assert.equal(ingredientsPath, '/recetas/papas-airfryer/ingredientes');
  assert.equal(isRecipeOverlayRoute(ingredientsPath), true);
  assert.notEqual(ingredientsPath, '/');
});

test('all recipes to papas-airfryer to ingredients keeps the library host screen instead of collapsing to home', () => {
  const setupHostScreen = resolveRecipeOverlayHostScreen('recipe-select', null);
  assert.equal(setupHostScreen, 'recipe-select');

  const ingredientsHostScreen = resolveRecipeOverlayHostScreen('recipe-select', setupHostScreen);
  assert.equal(ingredientsHostScreen, 'recipe-select');
  assert.notEqual(ingredientsHostScreen, 'category-select');
});
