import test from 'node:test';
import assert from 'node:assert/strict';

import type { Recipe, RecipeContent, WeeklyPlanItem } from '../../types';
import type { RecipeV2 } from '../types/recipe-v2';
import { createRecipeYield } from './recipeV2';
import { buildPlannedIngredientSelection, hydratePlannedItemForRuntime, resolvePlanningSnapshotV2 } from './planningSnapshotV2';

const recipe: Recipe = {
  id: 'papas-airfryer',
  categoryId: 'airfryer',
  name: 'Papas Airfryer',
  icon: '🍟',
  ingredient: 'papas',
  description: 'Crujientes',
  basePortions: 2,
};

const recipeContent: RecipeContent = {
  ingredients: [
    { name: 'Papa', emoji: '🥔', indispensable: true, portions: { 1: '1', 2: '2', 4: '4' } },
    { name: 'Pimienta', emoji: '🧂', portions: { 1: '1 cdta', 2: '2 cdta', 4: '4 cdta' } },
  ],
  steps: [],
  tip: 'Test',
  baseServings: 2,
  portionLabels: { singular: 'porción', plural: 'porciones' },
};

const recipeV2: RecipeV2 = {
  id: 'papas-airfryer',
  name: 'Papas Airfryer',
  description: 'Crujientes',
  ingredient: 'papas',
  categoryId: 'airfryer',
  baseYield: createRecipeYield({ type: 'weight', value: 500, unit: 'g', label: 'gramos' }),
  ingredients: [
    {
      id: 'papas',
      name: 'Papa',
      emoji: '🥔',
      indispensable: true,
      amount: { value: 500, canonicalUnit: 'g', visibleUnit: 'g', unit: 'g', family: 'weight', scalable: true, scalingPolicy: 'linear' },
    },
    {
      id: 'pimienta',
      name: 'Pimienta',
      emoji: '🧂',
      amount: { value: 2, canonicalUnit: 'cdta', visibleUnit: 'cdta', unit: 'cdta', family: 'tsp', scalable: true, scalingPolicy: 'linear' },
    },
  ],
  steps: [
    {
      id: 'step-1',
      title: 'Cocinar',
      equipment: 'airfryer',
      subSteps: [],
    },
  ],
  timeSummary: { prepMinutes: 5, cookMinutes: 20, totalMinutes: 25 },
  cookingContextDefaults: {
    selectedContainerKey: 'basket-medium',
    selectedContainerMeta: { kind: 'basket', sizeLabel: 'Canasta mediana', capacityMl: 3500 },
  },
};

test('resolvePlanningSnapshotV2 repairs mixed legacy snapshot into normalized V2 snapshot', () => {
  const snapshot = resolvePlanningSnapshotV2({
    recipe,
    recipeContent,
    recipeV2,
    snapshot: {
      quantityMode: 'have',
      peopleCount: 2,
      amountUnit: 'grams',
      availableCount: 750,
      targetYield: createRecipeYield({ type: 'servings', value: 3, unit: 'porciones', label: 'porciones' }),
      cookingContext: null,
      selectedOptionalIngredients: ['pimienta'],
      sourceContextSummary: null,
      resolvedPortion: 2,
      scaleFactor: 1,
    },
  });

  assert.equal(snapshot.targetYield?.type, 'weight');
  assert.equal(snapshot.targetYield?.value, 750);
  assert.equal(snapshot.quantityMode, 'have');
  assert.equal(snapshot.availableCount, 750);
  assert.deepEqual(snapshot.selectedOptionalIngredients, ['pimienta']);
  assert.equal(snapshot.cookingContext?.selectedContainerKey, 'basket-medium');
});

test('buildPlannedIngredientSelection matches V2 optional ingredients by legacy name fallback', () => {
  const item = {
    id: 'plan-1',
    weeklyPlanId: 'week-1',
    dayOfWeek: 1,
    slot: 'almuerzo',
    recipeId: recipe.id,
    recipeNameSnapshot: recipe.name,
    notes: null,
    sortOrder: 10,
    createdAt: '2026-03-19T00:00:00.000Z',
    configSnapshot: {
      quantityMode: 'have',
      peopleCount: 2,
      amountUnit: 'grams',
      availableCount: 750,
      targetYield: createRecipeYield({ type: 'weight', value: 750, unit: 'g', label: 'gramos' }),
      cookingContext: recipeV2.cookingContextDefaults ?? null,
      selectedOptionalIngredients: ['pimienta'],
      sourceContextSummary: null,
      resolvedPortion: 2,
      scaleFactor: 1.5,
    },
  } satisfies WeeklyPlanItem;

  const selection = buildPlannedIngredientSelection({
    item,
    recipe,
    recipeContent,
    recipeV2,
  });

  assert.deepEqual(selection, {
    papas: true,
    pimienta: true,
  });
});

test('hydratePlannedItemForRuntime returns V2 snapshot and ingredient selection for runtime handoff', () => {
  const item = {
    id: 'plan-2',
    weeklyPlanId: 'week-1',
    dayOfWeek: 2,
    slot: 'cena',
    recipeId: recipe.id,
    recipeNameSnapshot: recipe.name,
    notes: null,
    sortOrder: 20,
    createdAt: '2026-03-19T00:00:00.000Z',
    configSnapshot: {
      quantityMode: 'people',
      peopleCount: 4,
      amountUnit: null,
      availableCount: null,
      targetYield: null,
      cookingContext: null,
      selectedOptionalIngredients: ['pimienta'],
      sourceContextSummary: null,
      resolvedPortion: 4,
      scaleFactor: 2,
    },
  } satisfies WeeklyPlanItem;

  const hydrated = hydratePlannedItemForRuntime({
    item,
    recipe,
    recipeContent,
    recipeV2,
  });

  assert.equal(hydrated.snapshot.targetYield?.type, 'weight');
  assert.equal(hydrated.snapshot.targetYield?.value, 500);
  assert.equal(hydrated.snapshot.cookingContext?.selectedContainerKey, 'basket-medium');
  assert.equal(hydrated.ingredientSelection.papas, true);
  assert.equal(hydrated.ingredientSelection.pimienta, true);
});
