import test from 'node:test';
import assert from 'node:assert/strict';

import type { ScaledRecipeV2 } from '../types/recipe-v2';
import { getCompoundConfigSignature } from './useCompoundCookingSessionV2';

function makeRecipe(overrides?: Partial<ScaledRecipeV2>): ScaledRecipeV2 {
  return {
    id: 'tallarines-rojos-compuesto',
    name: 'Tallarines',
    baseYield: {
      type: 'servings',
      value: 4,
      canonicalUnit: 'servings',
      visibleUnit: 'porciones',
      label: 'porciones',
      unit: 'porciones',
    },
    selectedYield: {
      type: 'servings',
      value: 4,
      canonicalUnit: 'servings',
      visibleUnit: 'porciones',
      label: 'porciones',
      unit: 'porciones',
    },
    scaleFactor: 1,
    batchResolution: {
      batchCount: 1,
      perBatchScaleFactor: 1,
      containerFactor: 1,
    },
    ingredients: [],
    steps: [],
    warnings: [],
    timeSummary: {
      prepMinutes: 10,
      cookMinutes: 20,
      totalMinutes: 30,
    },
    experience: 'compound',
    compoundMeta: {
      components: [{ id: 'salsa', name: 'Salsa', icon: '🍅', summary: 'Base' }],
      timeline: [],
    },
    ...overrides,
  };
}

test('compound config signature changes when selected yield changes', () => {
  const baseRecipe = makeRecipe();
  const scaledRecipe = makeRecipe({
    selectedYield: {
      ...baseRecipe.selectedYield,
      value: 6,
    },
    scaleFactor: 1.5,
  });

  assert.notEqual(getCompoundConfigSignature(baseRecipe), getCompoundConfigSignature(scaledRecipe));
});

test('compound config signature changes when selected cooking context changes', () => {
  const baseRecipe = makeRecipe();
  const contextRecipe = makeRecipe({
    selectedCookingContext: {
      selectedContainerKey: 'basket-large',
      selectedContainerMeta: { kind: 'basket', sizeLabel: 'Canasta grande', capacityMl: 5000 },
    },
    batchResolution: {
      batchCount: 2,
      perBatchScaleFactor: 1,
      containerFactor: 0.7,
    },
  });

  assert.notEqual(getCompoundConfigSignature(baseRecipe), getCompoundConfigSignature(contextRecipe));
});
