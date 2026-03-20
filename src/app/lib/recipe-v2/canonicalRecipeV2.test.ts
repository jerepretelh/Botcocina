import test from 'node:test';
import assert from 'node:assert/strict';

import { localRecipeV2ById } from '../../data/recipes.v2';
import { isCanonicalRecipeV2 } from './canonicalRecipeV2';

test('isCanonicalRecipeV2 accepts non-scalable text-only optional amounts used by visible journey recipes', () => {
  assert.equal(isCanonicalRecipeV2(localRecipeV2ById['pan-palta-huevo']), true);
  assert.equal(isCanonicalRecipeV2(localRecipeV2ById['sopa-verduras']), true);
});

test('isCanonicalRecipeV2 keeps canonical visible recipes valid', () => {
  assert.equal(isCanonicalRecipeV2(localRecipeV2ById['quinua-desayuno']), true);
  assert.equal(isCanonicalRecipeV2(localRecipeV2ById['lomo-saltado-casero']), true);
  assert.equal(isCanonicalRecipeV2(localRecipeV2ById['tallarines-rojos-compuesto']), true);
});
