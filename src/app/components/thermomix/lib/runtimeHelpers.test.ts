import test from 'node:test';
import assert from 'node:assert/strict';

import { areRecipeYieldsEqual, buildRecipeSignature, dedupeRecipesBySignature } from './runtimeHelpers';

test('dedupeRecipesBySignature keeps the newest recipe when signatures collide', () => {
  const recipes = [
    {
      id: 'older',
      categoryId: 'desayunos',
      name: 'Quinua del desayuno',
      icon: '🥣',
      ingredient: 'Porciones',
      description: 'Desc',
      updatedAt: '2026-03-20T10:00:00.000Z',
    },
    {
      id: 'newer',
      categoryId: 'desayunos',
      name: 'Quinua del desayuno',
      icon: '🥣',
      ingredient: 'Porciones',
      description: 'Desc',
      updatedAt: '2026-03-21T10:00:00.000Z',
    },
  ];

  const recipeContentById = {
    older: {
      ingredients: [{ name: 'Quinua' }],
      steps: [{ stepName: 'Preparar', subSteps: [{ subStepName: 'Lavar' }] }],
    },
    newer: {
      ingredients: [{ name: 'Quinua' }],
      steps: [{ stepName: 'Preparar', subSteps: [{ subStepName: 'Lavar' }] }],
    },
  };

  assert.deepEqual(dedupeRecipesBySignature(recipes as never[], recipeContentById), [recipes[1]]);
});

test('buildRecipeSignature changes when ingredient structure changes', () => {
  const recipe = {
    id: 'quinua',
    categoryId: 'desayunos',
    name: 'Quinua',
    icon: '🥣',
    ingredient: 'Porciones',
    description: 'Desc',
  };

  const base = buildRecipeSignature(recipe as never, {
    ingredients: [{ name: 'Quinua' }],
    steps: [{ stepName: 'Preparar', subSteps: [{ subStepName: 'Lavar' }] }],
  });
  const changed = buildRecipeSignature(recipe as never, {
    ingredients: [{ name: 'Quinua' }, { name: 'Canela' }],
    steps: [{ stepName: 'Preparar', subSteps: [{ subStepName: 'Lavar' }] }],
  });

  assert.notEqual(base, changed);
});

test('areRecipeYieldsEqual compares normalized structural fields', () => {
  assert.equal(
    areRecipeYieldsEqual(
      {
        type: 'servings',
        value: 2,
        unit: 'porciones',
        label: 'porciones',
        canonicalUnit: 'servings',
        visibleUnit: 'porciones',
      },
      {
        type: 'servings',
        value: 2,
        unit: 'porciones',
        label: 'porciones',
        canonicalUnit: 'servings',
        visibleUnit: 'porciones',
      },
    ),
    true,
  );

  assert.equal(
    areRecipeYieldsEqual(
      {
        type: 'servings',
        value: 2,
        unit: 'porciones',
        label: 'porciones',
      },
      {
        type: 'servings',
        value: 4,
        unit: 'porciones',
        label: 'porciones',
      },
    ),
    false,
  );
});

