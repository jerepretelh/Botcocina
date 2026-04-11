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

test('buildWeeklyShoppingAggregationV2 separates incompatible units for same mergeKey', () => {
  const tomateUnidad: RecipeV2 = {
    ...recipeV2,
    id: 'tomate-unidad',
    name: 'Tomate en unidades',
    ingredients: [
      {
        id: 'tomate-a',
        name: 'Tomate',
        emoji: '🍅',
        indispensable: true,
        amount: { value: 2, canonicalUnit: 'unidad', visibleUnit: 'unidad', unit: 'unidad', family: 'unit', scalable: true, scalingPolicy: 'linear' },
      },
    ],
  };
  const tomateGramos: RecipeV2 = {
    ...recipeV2,
    id: 'tomate-gramos',
    name: 'Tomate en gramos',
    ingredients: [
      {
        id: 'tomate-b',
        name: 'Tomate',
        emoji: '🍅',
        indispensable: true,
        amount: { value: 300, canonicalUnit: 'g', visibleUnit: 'g', unit: 'g', family: 'weight', scalable: true, scalingPolicy: 'linear' },
      },
    ],
  };

  const baseSnapshot = {
    quantityMode: 'have' as const,
    peopleCount: 2,
    amountUnit: 'units' as const,
    availableCount: 1,
    targetYield: null,
    cookingContext: null,
    selectedOptionalIngredients: [],
    sourceContextSummary: null,
    resolvedPortion: 2 as const,
    scaleFactor: 1,
  };

  const itemUnidad = {
    id: 'plan-tomate-unidad',
    weeklyPlanId: 'week-1',
    dayOfWeek: 1,
    slot: 'almuerzo',
    recipeId: 'tomate-unidad',
    recipeNameSnapshot: 'Tomate en unidades',
    notes: null,
    sortOrder: 0,
    createdAt: '2026-03-31T00:00:00.000Z',
    configSnapshot: resolvePlanningSnapshotV2({
      recipe: { ...recipe, id: 'tomate-unidad', name: 'Tomate en unidades' },
      recipeContent,
      recipeV2: tomateUnidad,
      snapshot: baseSnapshot,
    }),
  } satisfies WeeklyPlanItem;

  const itemGramos = {
    id: 'plan-tomate-gramos',
    weeklyPlanId: 'week-1',
    dayOfWeek: 2,
    slot: 'cena',
    recipeId: 'tomate-gramos',
    recipeNameSnapshot: 'Tomate en gramos',
    notes: null,
    sortOrder: 1,
    createdAt: '2026-03-31T00:00:00.000Z',
    configSnapshot: resolvePlanningSnapshotV2({
      recipe: { ...recipe, id: 'tomate-gramos', name: 'Tomate en gramos' },
      recipeContent,
      recipeV2: tomateGramos,
      snapshot: baseSnapshot,
    }),
  } satisfies WeeklyPlanItem;

  const aggregation = buildWeeklyShoppingAggregationV2(
    [itemUnidad, itemGramos],
    {
      'tomate-unidad': tomateUnidad,
      'tomate-gramos': tomateGramos,
    },
    {},
    {
      'tomate-unidad': { ...recipe, id: 'tomate-unidad', name: 'Tomate en unidades' },
      'tomate-gramos': { ...recipe, id: 'tomate-gramos', name: 'Tomate en gramos' },
    },
  );

  const tomateGroup = aggregation.essentials?.find((group) => group.mergeKey === 'tomate');
  assert.ok(tomateGroup);
  assert.equal(tomateGroup?.hasIncompatibleUnits, true);
  assert.equal(tomateGroup?.entries.length, 2);
  assert.equal(aggregation.totalized.length, 2);
  assert.equal(
    aggregation.issues?.some((issue) => issue.code === 'INCOMPATIBLE_UNIT' && issue.mergeKey === 'tomate'),
    true,
  );
});

test('buildWeeklyShoppingAggregationV2 promotes mergeKey to essentials when mixed essential + optional', () => {
  const pimientaEssential: RecipeV2 = {
    ...recipeV2,
    id: 'pimienta-essential',
    name: 'Pimienta essential',
    ingredients: [
      {
        id: 'pimienta-a',
        name: 'Pimienta',
        emoji: '🧂',
        indispensable: true,
        amount: { value: 1, canonicalUnit: 'unidad', visibleUnit: 'unidad', unit: 'unidad', family: 'unit', scalable: true, scalingPolicy: 'linear' },
      },
    ],
  };
  const pimientaOptional: RecipeV2 = {
    ...recipeV2,
    id: 'pimienta-optional',
    name: 'Pimienta optional',
    ingredients: [
      {
        id: 'pimienta-b',
        name: 'Pimienta',
        emoji: '🧂',
        indispensable: false,
        amount: { value: 1, canonicalUnit: 'unidad', visibleUnit: 'unidad', unit: 'unidad', family: 'unit', scalable: true, scalingPolicy: 'linear' },
      },
    ],
  };

  const baseSnapshot = {
    quantityMode: 'have' as const,
    peopleCount: 2,
    amountUnit: 'units' as const,
    availableCount: 1,
    targetYield: null,
    cookingContext: null,
    selectedOptionalIngredients: ['pimienta-b'],
    sourceContextSummary: null,
    resolvedPortion: 2 as const,
    scaleFactor: 1,
  };

  const itemEssential = {
    id: 'plan-pimienta-essential',
    weeklyPlanId: 'week-1',
    dayOfWeek: 1,
    slot: 'almuerzo',
    recipeId: 'pimienta-essential',
    recipeNameSnapshot: 'Pimienta essential',
    notes: null,
    sortOrder: 0,
    createdAt: '2026-03-31T00:00:00.000Z',
    configSnapshot: resolvePlanningSnapshotV2({
      recipe: { ...recipe, id: 'pimienta-essential', name: 'Pimienta essential' },
      recipeContent,
      recipeV2: pimientaEssential,
      snapshot: baseSnapshot,
    }),
  } satisfies WeeklyPlanItem;

  const itemOptional = {
    id: 'plan-pimienta-optional',
    weeklyPlanId: 'week-1',
    dayOfWeek: 2,
    slot: 'cena',
    recipeId: 'pimienta-optional',
    recipeNameSnapshot: 'Pimienta optional',
    notes: null,
    sortOrder: 1,
    createdAt: '2026-03-31T00:00:00.000Z',
    configSnapshot: resolvePlanningSnapshotV2({
      recipe: { ...recipe, id: 'pimienta-optional', name: 'Pimienta optional' },
      recipeContent,
      recipeV2: pimientaOptional,
      snapshot: baseSnapshot,
    }),
  } satisfies WeeklyPlanItem;

  const aggregation = buildWeeklyShoppingAggregationV2(
    [itemEssential, itemOptional],
    {
      'pimienta-essential': pimientaEssential,
      'pimienta-optional': pimientaOptional,
    },
    {},
    {
      'pimienta-essential': { ...recipe, id: 'pimienta-essential', name: 'Pimienta essential' },
      'pimienta-optional': { ...recipe, id: 'pimienta-optional', name: 'Pimienta optional' },
    },
  );

  assert.equal(aggregation.essentials?.some((group) => group.mergeKey === 'pimienta'), true);
  assert.equal(aggregation.optionals?.some((group) => group.mergeKey === 'pimienta'), false);
});
