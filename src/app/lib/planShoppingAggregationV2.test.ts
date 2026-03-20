import test from 'node:test';
import assert from 'node:assert/strict';

import type { Recipe, RecipeContent, WeeklyPlanItem } from '../../types';
import type { RecipeV2 } from '../types/recipe-v2';
import { createRecipeYield } from './recipeV2';
import { buildWeeklyShoppingAggregationV2 } from './planShoppingAggregationV2';
import { resolvePlanningSnapshotV2 } from './planningSnapshotV2';

const recipe: Recipe = {
  id: 'arroz-base',
  categoryId: 'arroces',
  name: 'Arroz base',
  icon: '🍚',
  ingredient: 'unidades',
  description: 'Test',
  basePortions: 2,
};

const recipeContent: RecipeContent = {
  ingredients: [
    { name: 'Arroz', emoji: '🍚', indispensable: true, portions: { 1: '1 taza', 2: '2 tazas', 4: '4 tazas' } },
  ],
  steps: [],
  tip: 'Test',
  baseServings: 2,
  portionLabels: { singular: 'porción', plural: 'porciones' },
};

const recipeV2: RecipeV2 = {
  id: 'arroz-base',
  name: 'Arroz base',
  description: 'Test',
  ingredient: 'unidades',
  categoryId: 'arroces',
  baseYield: createRecipeYield({ type: 'units', value: 1, unit: 'unidad', label: 'unidades' }),
  ingredients: [
    {
      id: 'arroz',
      name: 'Arroz',
      emoji: '🍚',
      indispensable: true,
      amount: { value: 1, canonicalUnit: 'unidad', visibleUnit: 'unidad', unit: 'unidad', family: 'unit', scalable: true, scalingPolicy: 'linear' },
    },
  ],
  steps: [],
  timeSummary: { prepMinutes: 1, cookMinutes: 10, totalMinutes: 11 },
};

test('buildWeeklyShoppingAggregationV2 uses V2 scaling for V2 recipe snapshots repaired from legacy fields', () => {
  const item = {
    id: 'plan-arroz',
    weeklyPlanId: 'week-1',
    dayOfWeek: 0,
    slot: 'almuerzo',
    recipeId: recipe.id,
    recipeNameSnapshot: recipe.name,
    notes: null,
    sortOrder: 0,
    createdAt: '2026-03-19T00:00:00.000Z',
    configSnapshot: resolvePlanningSnapshotV2({
      recipe,
      recipeContent,
      recipeV2,
      snapshot: {
        quantityMode: 'have',
        peopleCount: 2,
        amountUnit: 'units',
        availableCount: 3,
        targetYield: null,
        cookingContext: null,
        selectedOptionalIngredients: [],
        sourceContextSummary: null,
        resolvedPortion: 2,
        scaleFactor: 1,
      },
    }),
  } satisfies WeeklyPlanItem;

  const aggregation = buildWeeklyShoppingAggregationV2(
    [item],
    { [recipe.id]: recipeV2 },
    { [recipe.id]: recipeContent },
    { [recipe.id]: recipe },
  );

  assert.equal(aggregation.totalized.length, 1);
  assert.equal(aggregation.totalized[0].itemName, 'Arroz');
  assert.equal(aggregation.totalized[0].quantityText, '3 unidad');
});
