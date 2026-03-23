import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = [
  '/Users/trabajo/bot/AsistenteCocina/src/app/lib/ai-recipe-generation/preparedRecipeRuntime.ts',
  '/Users/trabajo/bot/AsistenteCocina/src/app/lib/ai-recipe-generation/persistence.ts',
  '/Users/trabajo/bot/AsistenteCocina/src/app/components/thermomix/hooks/useLibraryAndSelectionController.ts',
  '/Users/trabajo/bot/AsistenteCocina/src/app/components/thermomix/hooks/useCookingRuntimeController.ts',
];

test('closure hotspots stay below the closure target thresholds', () => {
  const counts = files.map((file) => ({
    file,
    lines: readFileSync(file, 'utf8').split('\n').length,
  }));

  const tooLarge = counts.filter(({ lines }) => lines > 220);
  assert.deepEqual(tooLarge, []);
});
