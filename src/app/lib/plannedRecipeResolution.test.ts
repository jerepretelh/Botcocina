import test from 'node:test';
import assert from 'node:assert/strict';

import type { Recipe, WeeklyPlanItem } from '../../types';
import { resolvePlannedRecipeItem } from './plannedRecipeResolution';

const recipe: Recipe = {
  id: 'keke-platano-molde',
  name: 'Keke de plátano',
  categoryId: 'bakery',
  icon: '🍌',
  ingredient: 'keke',
  description: 'Receta pública',
};

const baseItem: WeeklyPlanItem = {
  id: 'plan-1',
  planId: 'week-1',
  recipeId: 'keke-platano-molde',
  recipeNameSnapshot: 'Keke de plátano',
  dayOfWeek: 1,
  slot: 'almuerzo',
  notes: null,
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
  configSnapshot: {
    quantityMode: 'people',
    peopleCount: 4,
    amountUnit: null,
    availableCount: null,
    resolvedPortion: '4',
    scaleFactor: 1,
    targetYield: null,
    cookingContext: null,
    selectedOptionalIngredients: [],
    sourceContextSummary: null,
  },
};

test('resolvePlannedRecipeItem marks a known recipe as resolvable', () => {
  const result = resolvePlannedRecipeItem(baseItem, new Map([[recipe.id, recipe]]));

  assert.equal(result.recipe?.id, recipe.id);
  assert.equal(result.isResolvable, true);
  assert.equal(result.isUnresolvable, false);
});

test('resolvePlannedRecipeItem marks a missing recipe as unresolvable', () => {
  const result = resolvePlannedRecipeItem(baseItem, {});

  assert.equal(result.recipe, null);
  assert.equal(result.isResolvable, false);
  assert.equal(result.isUnresolvable, true);
});

test('resolvePlannedRecipeItem keeps recipe-less items neutral', () => {
  const result = resolvePlannedRecipeItem({ ...baseItem, recipeId: null }, {});

  assert.equal(result.recipe, null);
  assert.equal(result.isResolvable, false);
  assert.equal(result.isUnresolvable, false);
});
