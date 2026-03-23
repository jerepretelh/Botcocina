import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isMissingCompoundColumnError,
  isMissingRecipeV2ColumnError,
  isMissingUserRecipeConfigsTableError,
} from './persistenceShared';

test('persistenceShared detects recipe v2 schema gaps without confusing compound columns', () => {
  assert.equal(isMissingRecipeV2ColumnError({ code: '42703', message: 'column ingredients_json does not exist' }), true);
  assert.equal(isMissingRecipeV2ColumnError({ message: 'column experience does not exist' }), false);
});

test('persistenceShared detects compound and config-table fallbacks explicitly', () => {
  assert.equal(isMissingCompoundColumnError({ message: 'column compound_meta does not exist' }), true);
  assert.equal(
    isMissingUserRecipeConfigsTableError({ code: 'PGRST205', message: 'Could not find the table user_recipe_cooking_configs' }),
    true,
  );
});
