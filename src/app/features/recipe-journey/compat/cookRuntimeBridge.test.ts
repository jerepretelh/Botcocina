import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCookRuntimeBridgePayload,
  enterCookRuntimeBridge,
  shouldUseCookRuntimeBridge,
} from './cookRuntimeBridge';

test('shouldUseCookRuntimeBridge only enables the bridge for cook stage', () => {
  assert.equal(shouldUseCookRuntimeBridge('setup'), false);
  assert.equal(shouldUseCookRuntimeBridge('ingredients'), false);
  assert.equal(shouldUseCookRuntimeBridge('cook'), true);
});

test('enterCookRuntimeBridge delegates to the cook runtime callback', () => {
  let invoked = 0;

  enterCookRuntimeBridge({
    recipeId: 'papas-airfryer',
    flowType: 'standard',
    selectedYield: null,
    selectedCookingContext: null,
    selectedIngredientIds: [],
  }, () => {
    invoked += 1;
  });

  assert.equal(invoked, 1);
});

test('buildCookRuntimeBridgePayload preserves compound flowType and selectedIngredientIds', () => {
  const payload = buildCookRuntimeBridgePayload({
    recipeId: 'arroz-lentejas-compuesto',
    currentStage: 'cook',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    setup: {
      selectedYield: {
        type: 'servings',
        value: 4,
        canonicalUnit: 'porciones',
        visibleUnit: 'porciones',
        label: 'porciones',
        unit: 'porciones',
      },
      selectedCookingContext: null,
      isValid: true,
    },
    ingredients: {
      selectedIngredientIds: ['lentejas', 'arroz', 'cebolla'],
      isConfirmed: true,
    },
  }, {
    id: 'arroz-lentejas-compuesto',
    name: 'Arroz con lentejas',
    flowType: 'compound',
    yield: {
      base: {
        type: 'servings',
        value: 4,
        canonicalUnit: 'porciones',
        visibleUnit: 'porciones',
        label: 'porciones',
        unit: 'porciones',
      },
      scalingModel: 'direct_yield',
    },
    setup: {
      fields: [],
      defaults: {},
    },
    ingredients: {
      allowOptionalSelection: true,
    },
    cook: {
      supportsResume: true,
    },
    capabilities: {
      supportsCookingContext: false,
      supportsOptionalIngredients: true,
    },
  });

  assert.equal(payload.recipeId, 'arroz-lentejas-compuesto');
  assert.equal(payload.flowType, 'compound');
  assert.deepEqual(payload.selectedIngredientIds, ['lentejas', 'arroz', 'cebolla']);
});

test('buildCookRuntimeBridgePayload preserves compound flowType and selectedIngredientIds for tallarines-rojos-compuesto', () => {
  const payload = buildCookRuntimeBridgePayload({
    recipeId: 'tallarines-rojos-compuesto',
    currentStage: 'cook',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'page',
    setup: {
      selectedYield: {
        type: 'servings',
        value: 4,
        canonicalUnit: 'porciones',
        visibleUnit: 'porciones',
        label: 'porciones',
        unit: 'porciones',
      },
      selectedCookingContext: null,
      isValid: true,
    },
    ingredients: {
      selectedIngredientIds: ['pasta', 'tomate', 'cebolla', 'ajo'],
      isConfirmed: true,
    },
  }, {
    id: 'tallarines-rojos-compuesto',
    name: 'Tallarines rojos coordinados',
    flowType: 'compound',
    yield: {
      base: {
        type: 'servings',
        value: 4,
        canonicalUnit: 'porciones',
        visibleUnit: 'porciones',
        label: 'porciones',
        unit: 'porciones',
      },
      scalingModel: undefined,
    },
    setup: {
      fields: [],
      defaults: {},
    },
    ingredients: {
      allowOptionalSelection: false,
    },
    cook: {
      supportsResume: true,
    },
    capabilities: {
      supportsCookingContext: false,
      supportsOptionalIngredients: false,
    },
  });

  assert.equal(payload.recipeId, 'tallarines-rojos-compuesto');
  assert.equal(payload.flowType, 'compound');
  assert.deepEqual(payload.selectedIngredientIds, ['pasta', 'tomate', 'cebolla', 'ajo']);
});

test('buildCookRuntimeBridgePayload preserves selectedIngredientIds when an optional ingredient is deselected', () => {
  const payload = buildCookRuntimeBridgePayload({
    recipeId: 'pan-palta-huevo',
    currentStage: 'cook',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    setup: {
      selectedYield: {
        type: 'units',
        value: 2,
        canonicalUnit: 'tostadas',
        visibleUnit: 'tostadas',
        label: 'tostadas',
        unit: 'tostadas',
      },
      selectedCookingContext: null,
      isValid: true,
    },
    ingredients: {
      selectedIngredientIds: ['pan', 'palta', 'huevo'],
      isConfirmed: true,
    },
  }, {
    id: 'pan-palta-huevo',
    name: 'Pan con palta y huevo',
    flowType: 'standard',
    yield: {
      base: {
        type: 'units',
        value: 2,
        canonicalUnit: 'tostadas',
        visibleUnit: 'tostadas',
        label: 'tostadas',
        unit: 'tostadas',
      },
      scalingModel: 'direct_yield',
    },
    setup: {
      fields: [],
      defaults: {},
    },
    ingredients: {
      allowOptionalSelection: true,
    },
    cook: {
      supportsResume: true,
    },
    capabilities: {
      supportsCookingContext: false,
      supportsOptionalIngredients: true,
    },
  });

  assert.equal(payload.recipeId, 'pan-palta-huevo');
  assert.equal(payload.flowType, 'standard');
  assert.deepEqual(payload.selectedIngredientIds, ['pan', 'palta', 'huevo']);
});

test('buildCookRuntimeBridgePayload preserves selectedIngredientIds for quinua-desayuno when an optional ingredient is deselected', () => {
  const payload = buildCookRuntimeBridgePayload({
    recipeId: 'quinua-desayuno',
    currentStage: 'cook',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'page',
    setup: {
      selectedYield: {
        type: 'servings',
        value: 2,
        canonicalUnit: 'porciones',
        visibleUnit: 'porciones',
        label: 'porciones',
        unit: 'porciones',
      },
      selectedCookingContext: null,
      isValid: true,
    },
    ingredients: {
      selectedIngredientIds: ['quinua', 'agua', 'leche', 'fruta'],
      isConfirmed: true,
    },
  }, {
    id: 'quinua-desayuno',
    name: 'Quinua del desayuno',
    flowType: 'standard',
    yield: {
      base: {
        type: 'servings',
        value: 2,
        canonicalUnit: 'porciones',
        visibleUnit: 'porciones',
        label: 'porciones',
        unit: 'porciones',
      },
      scalingModel: undefined,
    },
    setup: {
      fields: [],
      defaults: {},
    },
    ingredients: {
      allowOptionalSelection: true,
    },
    cook: {
      supportsResume: true,
    },
    capabilities: {
      supportsCookingContext: false,
      supportsOptionalIngredients: true,
    },
  });

  assert.equal(payload.recipeId, 'quinua-desayuno');
  assert.equal(payload.flowType, 'standard');
  assert.deepEqual(payload.selectedIngredientIds, ['quinua', 'agua', 'leche', 'fruta']);
});
