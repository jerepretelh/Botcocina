import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInitialExpandedPlanDays, buildShellShoppingItems, indexToShellDay, resolveTodayShellDay, shellDayToIndex, type PlannedRecipeEntry } from './shellModel';
import type { FixedRecipeJson } from './types';

function createRecipe(input: {
  id: string;
  title: string;
  ingredient: { name: string; canonicalName?: string; shoppingKey?: string };
}): FixedRecipeJson {
  return {
    id: input.id,
    title: input.title,
    servings: 2,
    ingredients: [
      {
        title: 'Base',
        items: [
          {
            name: input.ingredient.name,
            canonicalName: input.ingredient.canonicalName ?? input.ingredient.name.toLowerCase(),
            shoppingKey: input.ingredient.shoppingKey,
            amount: 1,
            unit: 'unidad',
          },
        ],
      },
    ],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Preparación',
        steps: [{ id: 's1', text: 'Paso 1' }],
      },
    ],
  };
}

test('shell day mapping supports full week', () => {
  assert.equal(shellDayToIndex('Lunes'), 1);
  assert.equal(shellDayToIndex('Domingo'), 7);
  assert.equal(indexToShellDay(4), 'Jueves');
  assert.equal(indexToShellDay(0), 'Domingo');
  assert.equal(indexToShellDay(7), 'Domingo');
});

test('buildInitialExpandedPlanDays expands only requested default day', () => {
  const model = buildInitialExpandedPlanDays('Jueves');
  assert.equal(model.Jueves, true);
  assert.equal(model.Lunes, false);
  assert.equal(model.Domingo, false);
});

test('resolveTodayShellDay maps javascript day index', () => {
  assert.equal(resolveTodayShellDay(new Date('2026-04-05T12:00:00.000Z')), 'Domingo');
  assert.equal(resolveTodayShellDay(new Date('2026-04-06T12:00:00.000Z')), 'Lunes');
});

test('buildShellShoppingItems falls back to normalized name when shoppingKey is missing', () => {
  const recipe = createRecipe({
    id: 'receta-1',
    title: 'Receta 1',
    ingredient: {
      name: 'Cebolla Roja',
      canonicalName: '',
      shoppingKey: '',
    },
  });
  const recipesById = new Map<string, FixedRecipeJson>([[recipe.id, recipe]]);
  const plannedEntries: PlannedRecipeEntry[] = [{ id: 'p1', recipeId: recipe.id, day: 'Lunes', moment: 'Almuerzo', createdAt: 1 }];

  const result = buildShellShoppingItems(plannedEntries, recipesById, {});
  assert.equal(result.length, 1);
  assert.equal(result[0]?.key, 'cebolla roja');
});

test('buildShellShoppingItems merges items by shared key across planned recipes', () => {
  const recipeA = createRecipe({
    id: 'receta-a',
    title: 'Receta A',
    ingredient: {
      name: 'Tomate',
      canonicalName: 'tomate',
      shoppingKey: 'tomate',
    },
  });
  const recipeB = createRecipe({
    id: 'receta-b',
    title: 'Receta B',
    ingredient: {
      name: 'Tomate cherry',
      canonicalName: 'tomate',
      shoppingKey: 'tomate',
    },
  });
  const recipesById = new Map<string, FixedRecipeJson>([
    [recipeA.id, recipeA],
    [recipeB.id, recipeB],
  ]);
  const plannedEntries: PlannedRecipeEntry[] = [
    { id: 'p1', recipeId: recipeA.id, day: 'Martes', moment: 'Cena', createdAt: 1 },
    { id: 'p2', recipeId: recipeB.id, day: 'Miércoles', moment: 'Cena', createdAt: 2 },
  ];

  const result = buildShellShoppingItems(plannedEntries, recipesById, {});
  assert.equal(result.length, 1);
  assert.equal(result[0]?.recipeTitles.length, 2);
});

test('buildShellShoppingItems sums numeric quantity across recipes with same key', () => {
  const recipeA = createRecipe({
    id: 'receta-q-a',
    title: 'Receta QA',
    ingredient: {
      name: 'Arroz',
      canonicalName: 'arroz',
      shoppingKey: 'arroz',
    },
  });
  recipeA.ingredients[0]!.items[0]!.amount = 1;
  recipeA.ingredients[0]!.items[0]!.unit = 'taza';

  const recipeB = createRecipe({
    id: 'receta-q-b',
    title: 'Receta QB',
    ingredient: {
      name: 'Arroz blanco',
      canonicalName: 'arroz',
      shoppingKey: 'arroz',
    },
  });
  recipeB.ingredients[0]!.items[0]!.amount = 2;
  recipeB.ingredients[0]!.items[0]!.unit = 'taza';

  const recipesById = new Map<string, FixedRecipeJson>([
    [recipeA.id, recipeA],
    [recipeB.id, recipeB],
  ]);
  const plannedEntries: PlannedRecipeEntry[] = [
    { id: 'p1', recipeId: recipeA.id, day: 'Lunes', moment: 'Almuerzo', createdAt: 1 },
    { id: 'p2', recipeId: recipeB.id, day: 'Martes', moment: 'Cena', createdAt: 2 },
  ];

  const result = buildShellShoppingItems(plannedEntries, recipesById, {});
  assert.equal(result.length, 1);
  assert.equal(result[0]?.quantityLabel, '3 taza');
  assert.equal(result[0]?.quantityValue, 3);
  assert.equal(result[0]?.quantityUnit, 'taza');
});

test('buildShellShoppingItems filters by selected recipe ids', () => {
  const recipeA = createRecipe({
    id: 'receta-select-a',
    title: 'A',
    ingredient: { name: 'Tomate', canonicalName: 'tomate', shoppingKey: 'tomate' },
  });
  const recipeB = createRecipe({
    id: 'receta-select-b',
    title: 'B',
    ingredient: { name: 'Ajo', canonicalName: 'ajo', shoppingKey: 'ajo' },
  });
  const recipesById = new Map<string, FixedRecipeJson>([
    [recipeA.id, recipeA],
    [recipeB.id, recipeB],
  ]);
  const plannedEntries: PlannedRecipeEntry[] = [
    { id: 'p1', recipeId: recipeA.id, day: 'Lunes', moment: 'Almuerzo', createdAt: 1 },
    { id: 'p2', recipeId: recipeB.id, day: 'Martes', moment: 'Cena', createdAt: 2 },
  ];

  const result = buildShellShoppingItems(plannedEntries, recipesById, {}, {
    selectedRecipeIds: [recipeB.id],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.name, 'Ajo');
});

test('buildShellShoppingItems includes manual items in same row model', () => {
  const result = buildShellShoppingItems([], new Map<string, FixedRecipeJson>(), {}, {
    manualItems: [{ key: 'manual-1', name: 'Detergente', quantityLabel: 'Libre', checked: true, price: '4.5' }],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.isManual, true);
  assert.equal(result[0]?.name, 'Detergente');
  assert.equal(result[0]?.checked, true);
  assert.equal(result[0]?.price, '4.5');
});
