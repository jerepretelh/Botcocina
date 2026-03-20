import test from 'node:test';
import assert from 'node:assert/strict';

import type { RecipeV2 } from '../../types/recipe-v2';
import { createRecipeYield } from '../../lib/recipeV2';
import { getYieldDisplayValue } from './recipeSetupScreenV2.helpers';

test('RecipeSetupScreenV2 does not render scientific notation for out-of-range selected yield', () => {
  const recipe: RecipeV2 = {
    id: 'arroz-perfecto',
    name: 'Arroz Perfecto',
    ingredient: 'arroz',
    baseYield: createRecipeYield({ type: 'volume', value: 2, unit: 'taza', label: 'tazas' }),
    ingredients: [],
    steps: [],
    timeSummary: { prepMinutes: 5, cookMinutes: 20, totalMinutes: 25 },
    scalingModel: 'base_ingredient',
    baseIngredientId: 'arroz',
  };

  const display = getYieldDisplayValue({
    ...recipe.baseYield,
    value: 8.74868792604316e+22,
  }, recipe.baseYield);

  assert.ok(!display.includes('e+'));
  assert.equal(display, '2');
});

test('RecipeSetupScreenV2 shows 2 tazas for sane Arroz Perfecto state', () => {
  const recipe: RecipeV2 = {
    id: 'arroz-perfecto',
    name: 'Arroz Perfecto',
    ingredient: 'arroz',
    baseYield: createRecipeYield({ type: 'volume', value: 2, unit: 'taza', label: 'tazas' }),
    ingredients: [],
    steps: [],
    timeSummary: { prepMinutes: 5, cookMinutes: 20, totalMinutes: 25 },
    scalingModel: 'base_ingredient',
    baseIngredientId: 'arroz',
  };

  const display = getYieldDisplayValue(recipe.baseYield, recipe.baseYield);

  assert.equal(display, '2');
  assert.equal(recipe.baseYield.label, 'tazas');
});

test('RecipeSetupScreenV2 keeps human servings display for serving-based recipes', () => {
  const recipe: RecipeV2 = {
    id: 'sopa',
    name: 'Sopa',
    ingredient: 'sopa',
    baseYield: {
      type: 'servings',
      value: 4,
      canonicalUnit: 'servings',
      visibleUnit: 'porciones',
      label: 'porciones',
      unit: 'porciones',
    },
    ingredients: [],
    steps: [],
    timeSummary: { prepMinutes: 10, cookMinutes: 15, totalMinutes: 25 },
    scalingModel: 'direct_yield',
  };

  const display = getYieldDisplayValue(recipe.baseYield, recipe.baseYield);

  assert.equal(display, '4');
  assert.equal(recipe.baseYield.label, 'porciones');
});
