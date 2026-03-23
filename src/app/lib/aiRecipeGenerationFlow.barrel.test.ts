import test from 'node:test';
import assert from 'node:assert/strict';

import * as barrel from './aiRecipeGenerationFlow';
import * as internal from './ai-recipe-generation/flow';

test('aiRecipeGenerationFlow barrel preserves public exports', () => {
  assert.equal(barrel.prepareGeneratedAIRecipeArtifacts, internal.prepareGeneratedAIRecipeArtifacts);
  assert.equal(barrel.persistPreparedAIRecipeWithFallback, internal.persistPreparedAIRecipeWithFallback);
  assert.equal(barrel.buildContextSummary, internal.buildContextSummary);
  assert.equal(barrel.assertGeneratedRecipePayload, internal.assertGeneratedRecipePayload);
});

