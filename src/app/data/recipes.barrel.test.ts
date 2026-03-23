import test from 'node:test';
import assert from 'node:assert/strict';

import {
  defaultRecipeContent,
  defaultRecipes,
  initialRecipeContent,
  recipeCategories,
  recipes,
} from './recipes';
import * as internal from './recipes-legacy/catalog';

test('recipes barrel preserves legacy catalog exports', () => {
  assert.deepEqual(recipes, internal.recipes);
  assert.deepEqual(recipeCategories, internal.recipeCategories);
  assert.deepEqual(defaultRecipes, internal.defaultRecipes);
  assert.deepEqual(defaultRecipeContent, internal.defaultRecipeContent);
  assert.equal(Object.keys(initialRecipeContent).length, Object.keys(internal.initialRecipeContent).length);
});

