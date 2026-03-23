import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bridgePath = '/Users/trabajo/bot/AsistenteCocina/src/app/components/thermomix/hooks/useAIRecipeGenerationBridge.ts';

test('useAIRecipeGenerationBridge centralizes AI wiring away from ThermomixCooker', () => {
  const source = readFileSync(bridgePath, 'utf8');

  assert.equal(source.includes('useAIRecipeGeneration('), true);
  assert.equal(source.includes('setCookingSteps'), true);
  assert.equal(source.includes('setTargetYield'), true);
  assert.equal(source.includes('setTimerScaleFactor'), true);
  assert.equal(source.includes('setCurrentStepIndex'), true);
});
