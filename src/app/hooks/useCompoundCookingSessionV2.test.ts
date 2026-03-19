import test from 'node:test';
import assert from 'node:assert/strict';

import type { ScaledRecipeV2 } from '../types/recipe-v2';
import { getCompoundConfigSignature } from './useCompoundCookingSessionV2';

function buildScaledRecipe(servings: number): ScaledRecipeV2 {
  return {
    id: 'tallarines-rojos-compuesto',
    name: 'Tallarines',
    baseYield: {
      type: 'servings',
      value: 2,
      canonicalUnit: 'servings',
      visibleUnit: 'porciones',
      label: 'porciones',
      unit: 'porciones',
    },
    selectedYield: {
      type: 'servings',
      value: servings,
      canonicalUnit: 'servings',
      visibleUnit: 'porciones',
      label: 'porciones',
      unit: 'porciones',
    },
    selectedCookingContext: null,
    scaleFactor: servings / 2,
    batchResolution: { batchCount: 1, perBatchScaleFactor: servings / 2, containerFactor: 1 },
    ingredients: [],
    steps: [],
    warnings: [],
    timeSummary: { prepMinutes: 10, cookMinutes: 20, totalMinutes: 30 },
    compoundMeta: {
      components: [{ id: 'salsa', name: 'Salsa', icon: '🍅', summary: 'Salsa' }],
      timeline: [],
    },
    experience: 'compound',
  };
}

test('compound config signature changes when effective recipe configuration changes', () => {
  const recipeA = buildScaledRecipe(2);
  const recipeB = buildScaledRecipe(4);

  assert.notEqual(getCompoundConfigSignature(recipeA), getCompoundConfigSignature(recipeB));
});
