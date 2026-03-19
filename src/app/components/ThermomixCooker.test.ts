import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveRoutableCategoryId } from '../lib/routableRecipeCategory';

test('non-routable recipe category does not resolve to a selected category', () => {
  assert.equal(resolveRoutableCategoryId('airfryer'), null);
});

test('valid recipe category keeps selectedCategory routable', () => {
  assert.equal(resolveRoutableCategoryId('breakfast'), 'breakfast');
});

test('papas-airfryer resolves to null category so setup route does not bounce to home', () => {
  assert.equal(resolveRoutableCategoryId('airfryer'), null);
});
