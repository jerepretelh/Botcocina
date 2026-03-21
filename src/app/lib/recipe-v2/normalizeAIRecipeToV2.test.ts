import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeAIRecipeToV2 } from './normalizeAIRecipeToV2';
import type { GeneratedRecipe } from '../recipeAI';

function buildBaseRecipe(overrides: Partial<GeneratedRecipe> = {}): GeneratedRecipe {
  return {
    name: 'Sopa casera',
    icon: '🍲',
    ingredient: 'sopa',
    description: 'Receta de prueba',
    tip: 'Sirve caliente.',
    portionLabels: { singular: 'porción', plural: 'porciones' },
    ingredients: [
      {
        name: 'Agua',
        emoji: '💧',
        indispensable: true,
        amount: { value: 500, unit: 'ml', text: '500 ml', scalable: true, scalingPolicy: 'linear' },
      },
    ],
    steps: [
      {
        title: 'Hervir',
        fireLevel: 'medium',
        subSteps: [
          {
            text: 'Hierve el caldo',
            notes: 'Hasta que rompa hervor.',
            timer: {
              durationSeconds: 600,
              scalingPolicy: 'gentle',
            },
            isTimer: true,
          },
        ],
      },
    ],
    ...overrides,
  };
}

test('normalizeAIRecipeToV2 falls back to servings when AI omits baseYield', () => {
  const recipeV2 = normalizeAIRecipeToV2(buildBaseRecipe({ baseServings: 3 }));

  assert.equal(recipeV2.baseYield.type, 'servings');
  assert.equal(recipeV2.baseYield.value, 3);
  assert.equal(recipeV2.baseYield.unit, 'porciones');
});

test('normalizeAIRecipeToV2 normalizes volume yields even when the AI omits the explicit type', () => {
  const recipeV2 = normalizeAIRecipeToV2(buildBaseRecipe({
    baseYield: {
      value: 750,
      unit: 'ml',
      visibleUnit: 'ml',
      label: 'ml',
    },
  }));

  assert.equal(recipeV2.baseYield.type, 'volume');
  assert.equal(recipeV2.baseYield.value, 750);
  assert.equal(recipeV2.baseYield.unit, 'ml');
});

test('normalizeAIRecipeToV2 preserves timers and structured amounts', () => {
  const recipeV2 = normalizeAIRecipeToV2(buildBaseRecipe());

  assert.equal(recipeV2.ingredients[0]?.amount.value, 500);
  assert.equal(recipeV2.ingredients[0]?.amount.unit, 'ml');
  assert.equal(recipeV2.steps[0]?.subSteps[0]?.timer?.durationSeconds, 600);
  assert.equal(recipeV2.steps[0]?.subSteps[0]?.timer?.scalingPolicy, 'gentle');
});

test('normalizeAIRecipeToV2 keeps experience and compoundMeta from AI payloads', () => {
  const recipeV2 = normalizeAIRecipeToV2(buildBaseRecipe({
    experience: 'compound',
    compoundMeta: {
      components: [
        { id: 'pasta', name: 'Pasta', icon: '🍝', summary: 'Cocción' },
        { id: 'salsa', name: 'Salsa', icon: '🍅', summary: 'Base' },
      ],
      timeline: [
        { id: 'cmp-pasta-1-1', componentId: 'pasta', stepIndex: 0, subStepIndex: 0 },
      ],
    },
  }));

  assert.equal(recipeV2.experience, 'compound');
  assert.ok(recipeV2.compoundMeta);
  assert.equal(recipeV2.compoundMeta?.components[0]?.id, 'pasta');
});
