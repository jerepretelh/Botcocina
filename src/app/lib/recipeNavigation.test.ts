import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveOverlayPinnedPath,
  resolveRecipeOverlayCloseDestination,
  resolveRecipeOverlayHostPath,
  resolveRecipeOverlayHostScreen,
  resolveRecipePresentationMode,
} from './recipeNavigation';
import { GLOBAL_RECIPES_ALL_PATH, GLOBAL_RECIPES_HOME_PATH } from './globalRecipesRoute';

test('resolveRecipePresentationMode separates unified journey from legacy overlay', () => {
  assert.equal(resolveRecipePresentationMode(true), 'journey-page');
  assert.equal(resolveRecipePresentationMode(false), 'legacy-overlay');
});

test('resolveRecipeOverlayHostScreen preserves the current valid host', () => {
  assert.equal(resolveRecipeOverlayHostScreen('recipe-select', null), 'recipe-select');
  assert.equal(resolveRecipeOverlayHostScreen('ingredients', 'compound-lab'), 'compound-lab');
  assert.equal(resolveRecipeOverlayHostScreen('category-select', null), 'recipe-select');
});

test('resolveRecipeOverlayHostPath keeps Todas as a concrete library context', () => {
  assert.equal(
    resolveRecipeOverlayHostPath({
      screen: 'recipe-select',
      selectedCategory: null,
      currentLocationPath: '/recetas-globales/todas',
    }),
    GLOBAL_RECIPES_ALL_PATH,
  );
  assert.equal(
    resolveRecipeOverlayHostPath({
      screen: 'global-recipes',
      selectedCategory: null,
      currentLocationPath: '/recetas-globales',
    }),
    GLOBAL_RECIPES_HOME_PATH,
  );
});

test('resolveRecipeOverlayCloseDestination returns to the explicit host path when present', () => {
  assert.deepEqual(
    resolveRecipeOverlayCloseDestination({
      currentScreen: 'ingredients',
      currentHostScreen: 'recipe-select',
      explicitHostPath: GLOBAL_RECIPES_ALL_PATH,
      selectedCategory: null,
    }),
    {
      screen: 'recipe-select',
      path: GLOBAL_RECIPES_ALL_PATH,
    },
  );
});

test('resolveOverlayPinnedPath keeps the recipe route while overlays are open', () => {
  assert.equal(
    resolveOverlayPinnedPath({
      screen: 'recipe-select',
      recipeId: 'papas-airfryer',
      selectedCategory: null,
      isRecipeSetupSheetOpen: false,
      isIngredientsSheetOpen: true,
      recipeOverlayPinnedPath: '/recetas/papas-airfryer/ingredientes',
    }),
    '/recetas/papas-airfryer/ingredientes',
  );
});
