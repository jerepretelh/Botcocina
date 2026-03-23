import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hookPath = '/Users/trabajo/bot/AsistenteCocina/src/app/components/thermomix/hooks/useCookingRuntimeController.ts';

test('useCookingRuntimeController delegates runtime entry and planned handoff slices', () => {
  const source = readFileSync(hookPath, 'utf8');

  assert.equal(source.includes('useThermomixCookingRuntimeEntry'), true);
  assert.equal(source.includes('useThermomixPlannedRuntimeHandoff'), true);
  assert.equal(source.includes('buildCookingSessionState'), false);
  assert.equal(source.includes('hydratePlannedItemForRuntime'), false);
});
