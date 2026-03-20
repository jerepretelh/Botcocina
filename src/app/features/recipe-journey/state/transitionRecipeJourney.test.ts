import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialRecipeJourneyState } from './createInitialRecipeJourneyState';
import { transitionRecipeJourney } from './transitionRecipeJourney';

test('OPEN_SETUP creates an initial setup journey state', () => {
  const state = transitionRecipeJourney(null, {
    type: 'OPEN_SETUP',
    recipeId: 'keke-platano-molde',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    selectedYield: {
      type: 'pan_size',
      value: 1,
      canonicalUnit: null,
      visibleUnit: 'molde mediano',
      label: 'molde mediano',
      containerKey: 'mold-medium',
      containerMeta: { kind: 'mold', sizeLabel: 'Molde mediano', diameterCm: 22 },
      unit: 'molde mediano',
    },
    selectedCookingContext: null,
    selectedIngredientIds: [],
    isSetupValid: true,
  });

  assert.ok(state);
  assert.equal(state?.currentStage, 'setup');
  assert.equal(state?.returnTo, '/recetas-globales/todas');
});

test('CONFIRM_SETUP advances to ingredients when setup is valid', () => {
  const state = createInitialRecipeJourneyState({
    recipeId: 'keke-platano-molde',
    currentStage: 'setup',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    selectedYield: {
      type: 'pan_size',
      value: 1,
      canonicalUnit: null,
      visibleUnit: 'molde mediano',
      label: 'molde mediano',
      containerKey: 'mold-medium',
      containerMeta: { kind: 'mold', sizeLabel: 'Molde mediano', diameterCm: 22 },
      unit: 'molde mediano',
    },
    selectedCookingContext: null,
    selectedIngredientIds: [],
    isSetupValid: true,
  });

  const nextState = transitionRecipeJourney(state, { type: 'CONFIRM_SETUP' });
  assert.equal(nextState?.currentStage, 'ingredients');
});

test('BACK_FROM_INGREDIENTS returns to setup', () => {
  const state = createInitialRecipeJourneyState({
    recipeId: 'keke-platano-molde',
    currentStage: 'ingredients',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    selectedYield: {
      type: 'pan_size',
      value: 1,
      canonicalUnit: null,
      visibleUnit: 'molde mediano',
      label: 'molde mediano',
      containerKey: 'mold-medium',
      containerMeta: { kind: 'mold', sizeLabel: 'Molde mediano', diameterCm: 22 },
      unit: 'molde mediano',
    },
    selectedCookingContext: null,
    selectedIngredientIds: [],
    isSetupValid: true,
  });

  const nextState = transitionRecipeJourney(state, { type: 'BACK_FROM_INGREDIENTS' });
  assert.equal(nextState?.currentStage, 'setup');
});

test('START_COOK marks ingredients as confirmed and advances to cook', () => {
  const state = createInitialRecipeJourneyState({
    recipeId: 'keke-platano-molde',
    currentStage: 'ingredients',
    returnTo: '/recetas-globales/todas',
    presentationMode: 'sheet',
    selectedYield: {
      type: 'pan_size',
      value: 1,
      canonicalUnit: null,
      visibleUnit: 'molde mediano',
      label: 'molde mediano',
      containerKey: 'mold-medium',
      containerMeta: { kind: 'mold', sizeLabel: 'Molde mediano', diameterCm: 22 },
      unit: 'molde mediano',
    },
    selectedCookingContext: null,
    selectedIngredientIds: [],
    isSetupValid: true,
  });

  const nextState = transitionRecipeJourney(state, { type: 'START_COOK' });
  assert.equal(nextState?.currentStage, 'cook');
  assert.equal(nextState?.ingredients.isConfirmed, true);
});
