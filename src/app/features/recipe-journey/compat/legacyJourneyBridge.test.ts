import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLegacyCookingBridgePayload,
  enterLegacyCookingBridge,
  shouldUseLegacyCookingBridge,
} from './legacyJourneyBridge';

test('shouldUseLegacyCookingBridge only enables the bridge for cook stage', () => {
  assert.equal(shouldUseLegacyCookingBridge('setup'), false);
  assert.equal(shouldUseLegacyCookingBridge('ingredients'), false);
  assert.equal(shouldUseLegacyCookingBridge('cook'), true);
});

test('enterLegacyCookingBridge delegates to the current cooking callback', () => {
  let invoked = 0;

  enterLegacyCookingBridge({
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

test('buildLegacyCookingBridgePayload preserves selectedCookingContext for the runtime bridge', () => {
  const payload = buildLegacyCookingBridgePayload({
    recipeId: 'papas-airfryer',
    currentStage: 'cook',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    setup: {
      selectedYield: {
        type: 'servings',
        value: 2,
        canonicalUnit: 'porciones',
        visibleUnit: 'porciones',
        label: 'porciones',
        unit: 'porciones',
      },
      selectedCookingContext: {
        selectedContainerKey: 'basket-medium',
        selectedContainerMeta: {
          kind: 'basket',
          sizeLabel: 'Canasta mediana',
          capacityMl: 3500,
        },
      },
      isValid: true,
    },
    ingredients: {
      selectedIngredientIds: [],
      isConfirmed: true,
    },
  }, {
    id: 'papas-airfryer',
    name: 'Papas en airfryer',
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
      scalingModel: 'direct_yield',
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
      supportsCookingContext: true,
      supportsOptionalIngredients: false,
    },
  });

  assert.equal(payload.recipeId, 'papas-airfryer');
  assert.equal(payload.flowType, 'standard');
  assert.equal(payload.selectedCookingContext?.selectedContainerKey, 'basket-medium');
  assert.equal(payload.selectedCookingContext?.selectedContainerMeta?.capacityMl, 3500);
  assert.deepEqual(payload.selectedIngredientIds, []);
});

test('buildLegacyCookingBridgePayload preserves compound flowType and selectedIngredientIds', () => {
  const payload = buildLegacyCookingBridgePayload({
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
