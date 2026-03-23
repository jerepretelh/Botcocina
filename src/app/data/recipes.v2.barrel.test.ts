import test from 'node:test';
import assert from 'node:assert/strict';

import { localRecipeV2ById, localRecipesV2 } from './recipes.v2';
import * as internal from './recipes-v2/catalog';

test('recipes.v2 barrel preserves catalog exports', () => {
  assert.deepEqual(localRecipesV2, internal.localRecipesV2);
  assert.deepEqual(localRecipeV2ById, internal.localRecipeV2ById);
});

