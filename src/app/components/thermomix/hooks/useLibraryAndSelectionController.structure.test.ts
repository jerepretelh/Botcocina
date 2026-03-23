import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hookPath = '/Users/trabajo/bot/AsistenteCocina/src/app/components/thermomix/hooks/useLibraryAndSelectionController.ts';

test('useLibraryAndSelectionController delegates catalog, hydration and search slices', () => {
  const source = readFileSync(hookPath, 'utf8');

  assert.equal(source.includes('useThermomixLibraryCatalog'), true);
  assert.equal(source.includes('useThermomixRecipeSelectionHydration'), true);
  assert.equal(source.includes('useThermomixSearchAndFavorites'), true);
  assert.equal(source.includes('buildMixedRecipeSearchResults'), false);
  assert.equal(source.includes('deriveRecipeSetupBehavior'), false);
});
