import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFixedRuntimeRoute } from './router';

test('parseFixedRuntimeRoute resolves runtime root', () => {
  assert.deepEqual(parseFixedRuntimeRoute('/runtime-fijo'), {
    isFixedRuntimeRoute: true,
    mode: 'library',
    recipeId: null,
  });
});

test('parseFixedRuntimeRoute resolves create route', () => {
  assert.deepEqual(parseFixedRuntimeRoute('/runtime-fijo/nueva-receta'), {
    isFixedRuntimeRoute: true,
    mode: 'create',
    recipeId: null,
  });
});

test('parseFixedRuntimeRoute resolves encoded recipe id', () => {
  assert.deepEqual(parseFixedRuntimeRoute('/runtime-fijo/arroz%20especial'), {
    isFixedRuntimeRoute: true,
    mode: 'runtime',
    recipeId: 'arroz especial',
  });
});

test('parseFixedRuntimeRoute rejects unrelated paths', () => {
  assert.deepEqual(parseFixedRuntimeRoute('/recetas/arroz/cocinar'), {
    isFixedRuntimeRoute: false,
    mode: null,
    recipeId: null,
  });
});
