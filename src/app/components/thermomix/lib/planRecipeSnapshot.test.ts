import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPlanRecipeSnapshot, resolveSelectedOptionalIngredientKeys } from './planRecipeSnapshot';

test('buildPlanRecipeSnapshot clears quantity-only fields when mode is people', () => {
  const snapshot = buildPlanRecipeSnapshot({
    quantityMode: 'people',
    peopleCount: 4,
    amountUnit: 'grams',
    availableCount: 500,
    targetYield: null,
    cookingContext: null,
    selectedOptionalIngredients: ['aji'],
    sourceContextSummary: null,
    resolvedPortion: 4,
    scaleFactor: 2,
  });

  assert.equal(snapshot.amountUnit, null);
  assert.equal(snapshot.availableCount, null);
  assert.equal(snapshot.peopleCount, 4);
});

test('resolveSelectedOptionalIngredientKeys keeps only enabled optional ingredients', () => {
  const keys = resolveSelectedOptionalIngredientKeys(
    [
      { name: 'Sal', indispensable: false },
      { name: 'Aji', indispensable: false },
      { name: 'Arroz', indispensable: true },
    ],
    {
      sal: true,
      aji: false,
    },
  );

  assert.deepEqual(keys, ['sal']);
});
