import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecipeYield, deriveTargetYieldFromLegacy, normalizeLegacyRecipeToV2, scaleRecipeV2 } from './recipeV2';
import type { Recipe, RecipeContent } from '../../types';

const sampleRecipe: Recipe = {
  id: 'test-arroz',
  categoryId: 'almuerzos',
  name: 'Arroz base',
  icon: '🍚',
  ingredient: 'arroz',
  description: 'Receta de prueba',
  basePortions: 2,
};

const sampleContent: RecipeContent = {
  tip: 'Tip',
  baseServings: 2,
  portionLabels: {
    singular: 'porción',
    plural: 'porciones',
  },
  ingredients: [
    {
      name: 'Arroz',
      emoji: '🍚',
      portions: { 1: '100 g', 2: '200 g', 4: '400 g' },
      baseValue: '200 g',
    },
  ],
  steps: [
    {
      stepNumber: 1,
      stepName: 'Cocer',
      fireLevel: 'medium',
      subSteps: [
        {
          subStepName: 'Hervir',
          notes: 'Usa agua',
          portions: { 1: 300, 2: 420, 4: 600 },
          baseValue: 420,
          isTimer: true,
        },
      ],
    },
  ],
};

test('deriveTargetYieldFromLegacy converts weight mode', () => {
  const targetYield = deriveTargetYieldFromLegacy({
    quantityMode: 'have',
    amountUnit: 'grams',
    availableCount: 500,
  });

  assert.equal(targetYield.type, 'weight');
  assert.equal(targetYield.value, 500);
  assert.equal(targetYield.unit, 'g');
});

test('normalizeLegacyRecipeToV2 and scaleRecipeV2 preserve exact scaling intent', () => {
  const recipeV2 = normalizeLegacyRecipeToV2(sampleRecipe, sampleContent);
  const scaled = scaleRecipeV2(recipeV2, createRecipeYield({
    type: 'servings',
    value: 4,
    unit: 'porciones',
    label: 'porciones',
  }));

  assert.equal(scaled.scaleFactor, 2);
  assert.equal(scaled.ingredients[0]?.displayAmount, '400 g');
  assert.equal(scaled.steps[0]?.subSteps[0]?.durationSeconds, 567);
});
