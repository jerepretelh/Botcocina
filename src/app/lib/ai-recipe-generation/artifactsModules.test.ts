import test from 'node:test';
import assert from 'node:assert/strict';

import { buildContextSummary } from './contextSummary';
import { buildRecipeEquivalenceSignature } from './equivalence';

test('buildRecipeEquivalenceSignature normalizes case and accents for equivalent recipes', () => {
  const signatureA = buildRecipeEquivalenceSignature(
    { name: 'Arroz con Pollo', ingredient: 'arroz' },
    {
      baseServings: 2,
      ingredients: [{ name: 'Arroz', indispensable: true, portions: { 1: '1/2 taza', 2: '1 taza', 4: '2 tazas' } }],
      steps: [{ stepNumber: 1, stepName: 'Cocinar', subSteps: [{ subStepName: 'Mezcla todo', notes: '', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false }] }],
    },
  );
  const signatureB = buildRecipeEquivalenceSignature(
    { name: 'ARROZ CON POLLO', ingredient: 'ARROZ' },
    {
      baseServings: 2,
      ingredients: [{ name: 'arroz', indispensable: true, portions: { 1: '1/2 taza', 2: '1 taza', 4: '2 tazas' } }],
      steps: [{ stepNumber: 1, stepName: 'Cocinar', subSteps: [{ subStepName: 'Mezcla todo', notes: '', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false }] }],
    },
  );

  assert.equal(signatureA, signatureB);
});

test('buildContextSummary keeps quantity-based labels for seeded AI contexts', () => {
  const summary = buildContextSummary(
    {
      prompt: 'Quiero una receta con tomate.',
      servings: 4,
      availableIngredients: [{ id: 'a1', value: 'Tomate' }],
      avoidIngredients: [{ id: 'a2', value: 'Apio' }],
    },
    {
      quantityMode: 'have',
      peopleCount: null,
      amountUnit: 'grams',
      availableCount: 600,
      selectedSeed: {
        id: 'seed-1',
        name: 'Lasaña',
        categoryId: 'dinner',
        searchTerms: ['lasaña'],
        locale: 'es-PE',
        isActive: true,
        sortOrder: 1,
      },
    },
  );

  assert.equal(summary?.summaryLabel, 'Basada en 600 g');
  assert.equal(summary?.seedName, 'Lasaña');
  assert.deepEqual(summary?.availableIngredients, ['Tomate']);
});
