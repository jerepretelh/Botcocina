import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecipeGuidelines } from './guidelines';
import type { FixedRecipeJson } from './types';

test('validateRecipeGuidelines returns no issues for a compliant recipe shape', () => {
  const recipe: FixedRecipeJson = {
    id: 'ok',
    title: 'Receta OK',
    servings: 4,
    ingredients: [
      {
        title: 'Base',
        items: [{ name: 'arroz', canonicalName: 'arroz', shoppingKey: 'arroz', amount: 400, unit: 'g' }],
      },
      {
        title: 'Salsa',
        items: [{ name: 'caldo', canonicalName: 'caldo', shoppingKey: 'caldo', amount: 200, unit: 'ml' }],
      },
    ],
    phases: [
      {
        id: 'p1',
        number: 'FASE 1',
        title: 'Preparación',
        steps: [{ id: 's1', text: 'Cortar cebolla en brunoise' }],
      },
      {
        id: 'p2',
        number: 'FASE 2',
        title: 'Cocción',
        steps: [
          {
            id: 's2',
            text: 'Agregar 400 g de arroz',
            timer: 120,
            ingredients: [{ name: 'arroz', canonicalName: 'arroz', shoppingKey: 'arroz', amount: 400, unit: 'g' }],
          },
          { id: 's3', text: 'Textura translúcida', type: 'result' },
        ],
      },
      {
        id: 'p3',
        number: 'FASE 3',
        title: 'Armado',
        steps: [{ id: 's4', text: 'Servir' }],
      },
    ],
  };

  assert.deepEqual(validateRecipeGuidelines(recipe), []);
});

test('validateRecipeGuidelines flags missing prep/final and missing structured ingredients on add step', () => {
  const recipe: FixedRecipeJson = {
    id: 'warn',
    title: 'Receta WARN',
    servings: 4,
    ingredients: [{ title: 'Todo', items: [{ name: 'arroz', canonicalName: 'arroz', shoppingKey: 'arroz', amount: 1, unit: 'unidad' }] }],
    phases: [
      {
        id: 'p1',
        number: 'FASE 1',
        title: 'Inicio',
        steps: [{ id: 's1', text: 'Agregar arroz', timer: 30 }],
      },
    ],
  };

  const issues = validateRecipeGuidelines(recipe);
  assert.equal(issues.length >= 4, true);
});

test('validateRecipeGuidelines accepts string amount in structured step ingredients', () => {
  const recipe: FixedRecipeJson = {
    id: 'string-amount',
    title: 'Receta string amount',
    servings: 2,
    ingredients: [{ title: 'Base', items: [{ name: 'sal', canonicalName: 'sal', shoppingKey: 'sal', amount: 'al gusto', unit: 'al gusto', isFlexible: true }] }],
    phases: [
      {
        id: 'p1',
        number: 'FASE 1',
        title: 'Preparación',
        steps: [{ id: 's1', text: 'Medir ingredientes' }],
      },
      {
        id: 'p2',
        number: 'FASE 2',
        title: 'Cocción',
        steps: [
          {
            id: 's2',
            text: 'Agregar sal',
            ingredients: [{ name: 'sal', canonicalName: 'sal', shoppingKey: 'sal', amount: 'al gusto', unit: 'al gusto', isFlexible: true }],
          },
          { id: 's3', text: 'Sabor equilibrado', type: 'result' },
        ],
      },
      {
        id: 'p3',
        number: 'FASE 3',
        title: 'Servir',
        steps: [{ id: 's4', text: 'Servir' }],
      },
    ],
  };
  const issues = validateRecipeGuidelines(recipe);
  assert.equal(issues.some((issue) => issue.message.includes('ingredients estructurado')), false);
});
