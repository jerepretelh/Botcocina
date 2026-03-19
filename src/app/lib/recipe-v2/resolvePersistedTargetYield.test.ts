import test from 'node:test';
import assert from 'node:assert/strict';

import type { RecipeV2, RecipeYieldV2 } from '../../types/recipe-v2';
import { createRecipeYield } from '../recipeV2';
import { resolvePersistedTargetYield } from './resolvePersistedTargetYield';

const baseRecipe: RecipeV2 = {
  id: 'arroz-perfecto',
  name: 'Arroz Perfecto',
  description: 'Test',
  ingredient: 'arroz',
  baseYield: createRecipeYield({ type: 'volume', value: 2, unit: 'taza', label: 'tazas' }),
  ingredients: [],
  steps: [],
  timeSummary: {
    prepMinutes: 5,
    cookMinutes: 20,
    totalMinutes: 25,
  },
  scalingModel: 'base_ingredient',
  sensitivity: 'ratio_sensitive',
  baseIngredientId: 'arroz',
};

function makeYield(partial: Partial<RecipeYieldV2>): RecipeYieldV2 {
  return {
    ...createRecipeYield({ type: 'volume', value: 2, unit: 'taza', label: 'tazas' }),
    ...partial,
  };
}

test('resolvePersistedTargetYield falls back to base yield for incompatible type', () => {
  const result = resolvePersistedTargetYield(baseRecipe, makeYield({
    type: 'servings',
    value: 4,
    canonicalUnit: 'servings',
    visibleUnit: 'porciones',
    label: 'porciones',
    unit: 'porciones',
  }));

  assert.deepEqual(result, baseRecipe.baseYield);
});

test('resolvePersistedTargetYield falls back to base yield for astronomical finite value', () => {
  const result = resolvePersistedTargetYield(baseRecipe, makeYield({
    value: 8.74868792604316e+22,
  }));

  assert.deepEqual(result, baseRecipe.baseYield);
});

test('resolvePersistedTargetYield preserves a valid reasonable target yield', () => {
  const result = resolvePersistedTargetYield(baseRecipe, makeYield({
    value: 960,
  }));

  assert.equal(result.type, 'volume');
  assert.equal(result.value, 960);
  assert.equal(result.visibleUnit, 'taza');
});
