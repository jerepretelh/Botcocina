import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const artifactsPath = '/Users/trabajo/bot/AsistenteCocina/src/app/lib/ai-recipe-generation/artifacts.ts';
const runtimePath = '/Users/trabajo/bot/AsistenteCocina/src/app/lib/ai-recipe-generation/preparedRecipeRuntime.ts';

test('artifacts barrel stays thin and public-facing', () => {
  const source = readFileSync(artifactsPath, 'utf8');

  assert.equal(source.includes("from './contextSummary'"), true);
  assert.equal(source.includes("from './equivalence'"), true);
  assert.equal(source.includes("from './preparedRecipeRuntime'"), true);
  assert.equal(source.includes('normalizeAIRecipeToV2'), false);
  assert.equal(source.includes('deriveTargetYieldFromLegacy'), false);
});

test('preparedRecipeRuntime delegates normalization, identity and runtime state builders', () => {
  const source = readFileSync(runtimePath, 'utf8');

  assert.equal(source.includes('normalizeGeneratedRecipeArtifacts'), true);
  assert.equal(source.includes('buildGeneratedRecipeIdentity'), true);
  assert.equal(source.includes('buildGeneratedRecipeRuntimeState'), true);
  assert.equal(source.includes('normalizeAIRecipeToV2'), false);
  assert.equal(source.includes('resolveCompoundExperience'), false);
  assert.equal(source.includes('deriveTargetYieldFromLegacy'), false);
});
