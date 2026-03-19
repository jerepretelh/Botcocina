import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLegacyPortionsFromBase, resolveIngredientDisplayValue, resolveSubStepDisplayValue, scaleQuantityText, scaleTimerSeconds } from './recipeScaling';

test('scaleQuantityText scales exact ingredient quantities from base servings', () => {
  assert.equal(scaleQuantityText('200 g', 1.5), '300 g');
  assert.equal(scaleQuantityText('1/2 taza', 2), '1 taza');
});

test('scaleTimerSeconds uses gentle scaling for larger serving changes', () => {
  assert.equal(scaleTimerSeconds(120, 1, 'gentle'), 120);
  assert.equal(scaleTimerSeconds(120, 2, 'gentle'), 162);
  assert.equal(scaleTimerSeconds(40, 2, 'gentle'), 40);
});

test('buildLegacyPortionsFromBase expands a single exact base to legacy buckets', () => {
  const portions = buildLegacyPortionsFromBase({
    baseValue: '300 g',
    baseServings: 3,
    isTimer: false,
  });

  assert.equal(portions[1], '100 g');
  assert.equal(portions[2], '200 g');
  assert.equal(portions[4], '400 g');
});

test('resolveIngredientDisplayValue prefers exact AI base values when available', () => {
  const ingredient = {
    name: 'Pasta',
    emoji: '🍝',
    portions: { 1: '100 g', 2: '200 g', 4: '400 g' },
    baseValue: '300 g',
  };

  const value = resolveIngredientDisplayValue({
    ingredient,
    recipe: { id: 'ai-pasta', categoryId: 'personalizadas', name: 'Pasta', icon: '🍝', ingredient: 'Pasta', description: 'Test', basePortions: 3 },
    portion: 2,
    peopleCount: 5,
    quantityMode: 'people',
  });

  assert.equal(value, '500 g');
});

test('resolveSubStepDisplayValue scales exact timer values without requiring 1/2/4 from IA', () => {
  const value = resolveSubStepDisplayValue({
    subStep: {
      subStepName: 'Hervir pasta',
      notes: 'Hasta al dente.',
      portions: { 1: 90, 2: 110, 4: 140 },
      baseValue: 120,
      timerScaling: 'gentle',
      isTimer: true,
    },
    recipe: { id: 'ai-pasta', categoryId: 'personalizadas', name: 'Pasta', icon: '🍝', ingredient: 'Pasta', description: 'Test', basePortions: 3 },
    portion: 2,
    peopleCount: 5,
    quantityMode: 'people',
  });

  assert.equal(value, 148);
});
