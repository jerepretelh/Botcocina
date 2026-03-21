import test from 'node:test';
import assert from 'node:assert/strict';
import type { RecipeContent } from '../../types';
import { coercePersistedCompoundRecipe, detectCompoundRecipeCandidate, validateCompoundMeta } from './compoundRecipeMeta';

const compoundCandidateContent: RecipeContent = {
  ingredients: [
    { name: 'Tallarines', emoji: '🍝', portions: { 1: '100 g', 2: '200 g', 4: '400 g' } },
    { name: 'Tomate', emoji: '🍅', portions: { 1: '1', 2: '2', 4: '4' } },
  ],
  tip: 'Coordina salsa y pasta.',
  portionLabels: { singular: 'porción', plural: 'porciones' },
  steps: [
    {
      stepNumber: 1,
      stepName: 'Preparar salsa',
      fireLevel: 'medium',
      subSteps: [
        { subStepName: 'Picar cebolla para la salsa', notes: 'Reserva por separado.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
        { subStepName: 'Reducir salsa de tomate', notes: 'Mientras tanto avanza con la pasta.', portions: { 1: 12, 2: 14, 4: 16 }, isTimer: true },
      ],
    },
    {
      stepNumber: 2,
      stepName: 'Cocer pasta',
      fireLevel: 'high',
      subSteps: [
        { subStepName: 'Hervir agua para pasta', notes: 'En otra olla.', portions: { 1: 10, 2: 12, 4: 14 }, isTimer: true },
        { subStepName: 'Escurrir pasta', notes: 'Reserva un poco del agua.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      ],
    },
  ],
};

const standardContent: RecipeContent = {
  ingredients: [
    { name: 'Avena', emoji: '🥣', portions: { 1: '1/2 taza', 2: '1 taza', 4: '2 tazas' } },
  ],
  tip: 'Revuelve seguido.',
  portionLabels: { singular: 'porción', plural: 'porciones' },
  steps: [
    {
      stepNumber: 1,
      stepName: 'Cocinar avena',
      fireLevel: 'medium',
      subSteps: [
        { subStepName: 'Calentar leche', notes: 'Sin dejar hervir.', portions: { 1: 20, 2: 25, 4: 30 }, isTimer: true },
        { subStepName: 'Agregar avena', notes: 'Remueve hasta espesar.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      ],
    },
  ],
};

test('detectCompoundRecipeCandidate builds compound meta for clear parallel recipes', () => {
  const detected = detectCompoundRecipeCandidate(compoundCandidateContent);

  assert.ok(detected);
  assert.equal(detected.components.length, 2);
  assert.ok(detected.components.some((component) => component.id === 'pasta'));
  assert.ok(detected.components.some((component) => component.id === 'salsa'));
  assert.equal(validateCompoundMeta(compoundCandidateContent, detected), true);
});

test('detectCompoundRecipeCandidate returns null for linear recipes', () => {
  const detected = detectCompoundRecipeCandidate(standardContent);
  assert.equal(detected, null);
});

test('detectCompoundRecipeCandidate recognizes AI-style parallel payloads, not only curated fixtures', () => {
  const aiLikeContent: RecipeContent = {
    ingredients: [
      { name: 'Tallarines', emoji: '🍝', portions: { 1: '100 g', 2: '200 g', 4: '400 g' } },
      { name: 'Tomate', emoji: '🍅', portions: { 1: '2', 2: '4', 4: '8' } },
      { name: 'Queso', emoji: '🧀', portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
    ],
    tip: 'Termina con queso rallado.',
    portionLabels: { singular: 'plato', plural: 'platos' },
    steps: [
      {
        stepNumber: 1,
        stepName: 'Preparar salsa',
        fireLevel: 'medium',
        subSteps: [
          { subStepName: 'Sofríe cebolla para la salsa', notes: 'Reserva por separado.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
          { subStepName: 'Reducir salsa de tomate', notes: 'Mientras tanto avanza con la pasta.', portions: { 1: 8, 2: 9, 4: 10 }, isTimer: true },
        ],
      },
      {
        stepNumber: 2,
        stepName: 'Cocer pasta',
        fireLevel: 'high',
        subSteps: [
          { subStepName: 'Hervir agua para pasta', notes: 'En otra olla.', portions: { 1: 7, 2: 8, 4: 9 }, isTimer: true },
          { subStepName: 'Escurrir tallarines', notes: 'Reserva parte del agua y mezcla al final.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
        ],
      },
    ],
  };

  const detected = detectCompoundRecipeCandidate(aiLikeContent);

  assert.ok(detected);
  assert.equal(detected.components.some((component) => component.id === 'pasta'), true);
  assert.equal(detected.components.some((component) => component.id === 'salsa'), true);
  assert.equal(validateCompoundMeta(aiLikeContent, detected), true);
});

test('validateCompoundMeta rejects invalid timeline indexes', () => {
  const invalidMeta = {
    components: [{ id: 'pasta', name: 'Pasta', icon: '🍝', summary: 'Cocción' }, { id: 'salsa', name: 'Salsa', icon: '🍅', summary: 'Base' }],
    timeline: [{ id: 'broken', componentId: 'pasta', stepIndex: 4, subStepIndex: 0 }],
  };

  assert.equal(validateCompoundMeta(compoundCandidateContent, invalidMeta as any), false);
});

test('coercePersistedCompoundRecipe recovers compound classification from content when persistence fell back to legacy columns', () => {
  const coerced = coercePersistedCompoundRecipe({
    experience: undefined,
    compoundMeta: undefined,
    content: compoundCandidateContent,
  });

  assert.equal(coerced.experience, 'compound');
  assert.ok(coerced.compoundMeta);
  assert.equal(validateCompoundMeta(compoundCandidateContent, coerced.compoundMeta), true);
});
