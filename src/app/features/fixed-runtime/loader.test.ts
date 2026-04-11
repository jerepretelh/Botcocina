import test from 'node:test';
import assert from 'node:assert/strict';
import { findFixedRecipeById, parseFixedRecipesJson } from './loader';

test('parseFixedRecipesJson validates a valid recipe list', () => {
  const parsed = parseFixedRecipesJson([
    {
      id: 'receta-1',
      title: 'Receta 1',
      servings: 8,
      ingredients: [{ title: 'Base', items: [{ name: 'agua', canonicalName: 'agua', shoppingKey: 'agua', amount: 1, unit: 'lt' }] }],
      phases: [
        {
          id: 'f1',
          number: 'FASE 1',
          title: 'Inicio',
          steps: [{ id: 's1', text: 'Hervir', timer: 120 }],
        },
      ],
    },
  ]);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.servings, 8);
});

test('parseFixedRecipesJson rejects invalid servings', () => {
  assert.throws(
    () =>
      parseFixedRecipesJson([
        {
          id: 'receta-1',
          title: 'Receta 1',
          servings: '4',
          ingredients: [{ title: 'Base', items: [{ name: 'agua', canonicalName: 'agua', shoppingKey: 'agua', amount: 1, unit: 'lt' }] }],
          phases: [{ id: 'f1', number: 'FASE 1', title: 'Inicio', steps: [{ id: 's1', text: 'Paso' }] }],
        },
      ]),
    /servings inválido/,
  );
});

test('findFixedRecipeById returns null for unknown ids', () => {
  const parsed = parseFixedRecipesJson([
    {
      id: 'receta-1',
      title: 'Receta 1',
      servings: 4,
      ingredients: [{ title: 'Base', items: [{ name: 'agua', canonicalName: 'agua', shoppingKey: 'agua', amount: 1, unit: 'lt' }] }],
      phases: [{ id: 'f1', number: 'FASE 1', title: 'Inicio', steps: [{ id: 's1', text: 'Paso' }] }],
    },
  ]);
  assert.equal(findFixedRecipeById(parsed, 'missing'), null);
});

test('parseFixedRecipesJson accepts schema v2.1 optional presentation fields', () => {
  const parsed = parseFixedRecipesJson([
    {
      id: 'limonada-4p',
      title: 'Limonada',
      recipeCategory: 'beverage',
      equipment: ['licuadora', 'jarra'],
      servings: 4,
      ingredients: [
        {
          title: 'Base',
          icon: '🥤',
          items: [
            {
              name: 'agua',
              canonicalName: 'agua',
              shoppingKey: 'agua',
              amount: 1200,
              unit: 'ml',
              displayAmount: '5',
              displayUnit: 'tazas',
              isOptional: false,
            },
          ],
        },
      ],
      phases: [
        {
          id: 'f1',
          number: 'FASE 1',
          title: 'Mezcla',
          steps: [
            {
              id: 's1',
              kind: 'action',
              text: 'Agregar agua.',
              ingredients: [
                {
                  name: 'agua',
                  canonicalName: 'agua',
                  shoppingKey: 'agua',
                  amount: 1200,
                  unit: 'ml',
                  displayAmount: '5',
                  displayUnit: 'tazas',
                  isOptional: false,
                },
              ],
            },
          ],
        },
      ],
    },
  ]);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.recipeCategory, 'beverage');
  assert.deepEqual(parsed[0]?.equipment, ['licuadora', 'jarra']);
  assert.equal(parsed[0]?.ingredients[0]?.items[0]?.displayAmount, '5');
  assert.equal(parsed[0]?.phases[0]?.steps[0]?.ingredients?.[0]?.displayUnit, 'tazas');
});

test('parseFixedRecipesJson acepta steps kind=group y los aplana para el runtime', () => {
  const parsed = parseFixedRecipesJson([
    {
      id: 'receta-group',
      title: 'Receta agrupada',
      servings: 2,
      ingredients: [{ title: 'Base', items: [{ name: 'agua', canonicalName: 'agua', shoppingKey: 'agua', amount: 1, unit: 'lt' }] }],
      phases: [
        {
          id: 'f1',
          number: 'FASE 1',
          title: 'Preparar',
          steps: [
            {
              id: 'g1',
              kind: 'group',
              title: 'Preparar base',
              substeps: [
                { kind: 'action', text: 'Lavar ingredientes' },
                { id: 'g1-2', kind: 'action', text: 'Cortar ingredientes' },
              ],
            },
          ],
        },
      ],
    },
  ]);

  const steps = parsed[0]?.phases[0]?.steps ?? [];
  assert.equal(steps.length, 3);
  assert.equal(steps[0]?.text, 'Preparar base');
  assert.equal(steps[1]?.id, 'g1-sub-1');
  assert.equal(steps[1]?.text, 'Preparar base: Lavar ingredientes');
  assert.equal(steps[2]?.text, 'Preparar base: Cortar ingredientes');
});
