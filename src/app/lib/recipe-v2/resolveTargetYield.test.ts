import test from 'node:test';
import assert from 'node:assert/strict';

import type { RecipeV2 } from '../../types/recipe-v2';
import { createRecipeYield } from '../recipeV2';
import { normalizeTargetYield } from './resolveTargetYield';

const volumeRecipe: RecipeV2 = {
  id: 'arroz-perfecto',
  name: 'Arroz Perfecto',
  baseYield: createRecipeYield({ type: 'volume', value: 2, unit: 'taza', label: 'tazas' }),
  ingredients: [],
  steps: [],
  timeSummary: {
    prepMinutes: 5,
    cookMinutes: 20,
    totalMinutes: 25,
  },
};

const servingsRecipe: RecipeV2 = {
  id: 'sopa',
  name: 'Sopa',
  baseYield: {
    type: 'servings',
    value: 2,
    canonicalUnit: 'servings',
    visibleUnit: 'porciones',
    label: 'porciones',
    unit: 'porciones',
  },
  ingredients: [],
  steps: [],
  timeSummary: {
    prepMinutes: 10,
    cookMinutes: 15,
    totalMinutes: 25,
  },
};

test('normalizeTargetYield rejects NaN and Infinity using base yield fallback', () => {
  const nanResult = normalizeTargetYield(volumeRecipe, {
    ...volumeRecipe.baseYield,
    value: Number.NaN,
  });
  const infinityResult = normalizeTargetYield(volumeRecipe, {
    ...volumeRecipe.baseYield,
    value: Number.POSITIVE_INFINITY,
  });

  assert.equal(nanResult.value, 480);
  assert.equal(infinityResult.value, 480);
});

test('normalizeTargetYield rejects absurd magnitude above reasonable maximum', () => {
  const result = normalizeTargetYield(volumeRecipe, {
    ...volumeRecipe.baseYield,
    value: 9e20,
  });

  assert.equal(result.value, 480);
  assert.equal(result.type, 'volume');
});

test('normalizeTargetYield preserves normal volume values', () => {
  const result = normalizeTargetYield(volumeRecipe, {
    ...volumeRecipe.baseYield,
    value: 960,
  });

  assert.equal(result.value, 960);
  assert.equal(result.visibleUnit, 'taza');
});

test('normalizeTargetYield preserves normal servings values', () => {
  const result = normalizeTargetYield(servingsRecipe, {
    ...servingsRecipe.baseYield,
    value: 4,
  });

  assert.equal(result.value, 4);
  assert.equal(result.type, 'servings');
});
