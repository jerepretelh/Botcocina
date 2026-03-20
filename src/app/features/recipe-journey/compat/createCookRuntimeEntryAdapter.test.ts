import test from 'node:test';
import assert from 'node:assert/strict';

import { createCookRuntimeEntryAdapter } from './createCookRuntimeEntryAdapter';

test('createCookRuntimeEntryAdapter dispatches compound payloads to the compound runtime', () => {
  let compoundEntered = 0;
  let legacyStarted = 0;
  let navigatedTo: string | null = null;

  const adapter = createCookRuntimeEntryAdapter({
    selectedRecipe: { id: 'arroz-lentejas-compuesto', name: 'Arroz con lentejas', experience: 'compound' } as any,
    recipeV2ById: {},
    hasRecipeV2: true,
    setTargetYield: () => undefined,
    setCookingContext: () => undefined,
    setIngredientSelectionByRecipe: () => undefined,
    enterCompoundCookingRuntime: () => {
      compoundEntered += 1;
    },
    enterStandardCookingRuntime: () => undefined,
    startLegacyCooking: () => {
      legacyStarted += 1;
    },
    navigateToCookingRoute: (recipeId) => {
      navigatedTo = recipeId;
    },
  });

  adapter.enterCookRuntime({
    recipeId: 'arroz-lentejas-compuesto',
    flowType: 'compound',
    selectedYield: null,
    selectedCookingContext: null,
    selectedIngredientIds: ['lentejas'],
  });

  assert.equal(compoundEntered, 1);
  assert.equal(legacyStarted, 0);
  assert.equal(navigatedTo, 'arroz-lentejas-compuesto');
});

test('createCookRuntimeEntryAdapter dispatches tallarines-rojos-compuesto payloads to the compound runtime', () => {
  let compoundEntered = 0;
  let legacyStarted = 0;
  let navigatedTo: string | null = null;

  const adapter = createCookRuntimeEntryAdapter({
    selectedRecipe: { id: 'tallarines-rojos-compuesto', name: 'Tallarines rojos coordinados', experience: 'compound' } as any,
    recipeV2ById: {},
    hasRecipeV2: true,
    setTargetYield: () => undefined,
    setCookingContext: () => undefined,
    setIngredientSelectionByRecipe: () => undefined,
    enterCompoundCookingRuntime: () => {
      compoundEntered += 1;
    },
    enterStandardCookingRuntime: () => undefined,
    startLegacyCooking: () => {
      legacyStarted += 1;
    },
    navigateToCookingRoute: (recipeId) => {
      navigatedTo = recipeId;
    },
  });

  adapter.enterCookRuntime({
    recipeId: 'tallarines-rojos-compuesto',
    flowType: 'compound',
    selectedYield: null,
    selectedCookingContext: null,
    selectedIngredientIds: ['pasta', 'tomate'],
  });

  assert.equal(compoundEntered, 1);
  assert.equal(legacyStarted, 0);
  assert.equal(navigatedTo, 'tallarines-rojos-compuesto');
});

test('createCookRuntimeEntryAdapter dispatches standard payloads to the standard runtime', () => {
  let standardEntered = 0;

  const adapter = createCookRuntimeEntryAdapter({
    selectedRecipe: { id: 'keke-platano-molde', name: 'Keke de plátano', experience: 'standard' } as any,
    recipeV2ById: {},
    hasRecipeV2: true,
    setTargetYield: () => undefined,
    setCookingContext: () => undefined,
    setIngredientSelectionByRecipe: () => undefined,
    enterCompoundCookingRuntime: () => undefined,
    enterStandardCookingRuntime: () => {
      standardEntered += 1;
    },
    startLegacyCooking: () => undefined,
    navigateToCookingRoute: () => undefined,
  });

  adapter.enterCookRuntime({
    recipeId: 'keke-platano-molde',
    flowType: 'standard',
    selectedYield: null,
    selectedCookingContext: null,
    selectedIngredientIds: [],
  });

  assert.equal(standardEntered, 1);
});

test('createCookRuntimeEntryAdapter reapplies a partial ingredient selection before entering the current standard runtime', () => {
  let capturedSelection: Record<string, Record<string, boolean>> | null = null;

  const adapter = createCookRuntimeEntryAdapter({
    selectedRecipe: { id: 'pan-palta-huevo', name: 'Pan con palta y huevo', experience: 'standard' } as any,
    recipeV2ById: {
      'pan-palta-huevo': {
        id: 'pan-palta-huevo',
        ingredients: [
          { id: 'pan', indispensable: true },
          { id: 'palta', indispensable: true },
          { id: 'huevo', indispensable: true },
          { id: 'sal', indispensable: false },
        ],
      } as any,
    },
    hasRecipeV2: true,
    setTargetYield: () => undefined,
    setCookingContext: () => undefined,
    setIngredientSelectionByRecipe: (updater) => {
      capturedSelection = updater({});
    },
    enterCompoundCookingRuntime: () => undefined,
    enterStandardCookingRuntime: () => undefined,
    startLegacyCooking: () => undefined,
    navigateToCookingRoute: () => undefined,
  });

  adapter.enterCookRuntime({
    recipeId: 'pan-palta-huevo',
    flowType: 'standard',
    selectedYield: null,
    selectedCookingContext: null,
    selectedIngredientIds: ['pan', 'palta', 'huevo'],
  });

  assert.deepEqual(capturedSelection, {
    'pan-palta-huevo': {
      pan: true,
      palta: true,
      huevo: true,
      sal: false,
    },
  });
});

test('createCookRuntimeEntryAdapter reapplies a partial ingredient selection for quinua-desayuno before entering the current standard runtime', () => {
  let capturedSelection: Record<string, Record<string, boolean>> | null = null;

  const adapter = createCookRuntimeEntryAdapter({
    selectedRecipe: { id: 'quinua-desayuno', name: 'Quinua del desayuno', experience: 'standard' } as any,
    recipeV2ById: {
      'quinua-desayuno': {
        id: 'quinua-desayuno',
        ingredients: [
          { id: 'quinua', indispensable: true },
          { id: 'agua', indispensable: true },
          { id: 'leche', indispensable: false },
          { id: 'miel', indispensable: false },
          { id: 'fruta', indispensable: false },
        ],
      } as any,
    },
    hasRecipeV2: true,
    setTargetYield: () => undefined,
    setCookingContext: () => undefined,
    setIngredientSelectionByRecipe: (updater) => {
      capturedSelection = updater({});
    },
    enterCompoundCookingRuntime: () => undefined,
    enterStandardCookingRuntime: () => undefined,
    startLegacyCooking: () => undefined,
    navigateToCookingRoute: () => undefined,
  });

  adapter.enterCookRuntime({
    recipeId: 'quinua-desayuno',
    flowType: 'standard',
    selectedYield: null,
    selectedCookingContext: null,
    selectedIngredientIds: ['quinua', 'agua', 'leche', 'fruta'],
  });

  assert.deepEqual(capturedSelection, {
    'quinua-desayuno': {
      quinua: true,
      agua: true,
      leche: true,
      miel: false,
      fruta: true,
    },
  });
});
