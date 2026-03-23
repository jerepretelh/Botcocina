import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isOverlayBackgroundMuted,
  resolveOverlayVariants,
  resolvePlanSnapshotScaleFactor,
} from './overlayVariants';

test('resolveOverlayVariants prioritizes unified journey overlays', () => {
  assert.deepEqual(
    resolveOverlayVariants({
      shouldRenderUnifiedJourneyOverlay: true,
      shouldRenderSetupV2: false,
      shouldRenderSetupCompat: false,
      shouldRenderIngredientsV2: false,
      shouldRenderIngredientsCompat: false,
    }),
    { setupVariant: 'journey', ingredientsVariant: 'journey' },
  );
});

test('resolveOverlayVariants maps compat branches without exposing legacy wording', () => {
  assert.deepEqual(
    resolveOverlayVariants({
      shouldRenderUnifiedJourneyOverlay: false,
      shouldRenderSetupV2: false,
      shouldRenderSetupCompat: true,
      shouldRenderIngredientsV2: false,
      shouldRenderIngredientsCompat: true,
    }),
    { setupVariant: 'compat', ingredientsVariant: 'compat' },
  );
});

test('resolvePlanSnapshotScaleFactor switches between setup and cooking contexts', () => {
  assert.equal(resolvePlanSnapshotScaleFactor({ screen: 'recipe-setup', cookingScaleFactor: 3, setupScaleFactor: 1.5 }), 1.5);
  assert.equal(resolvePlanSnapshotScaleFactor({ screen: 'cooking', cookingScaleFactor: 3, setupScaleFactor: 1.5 }), 3);
});

test('isOverlayBackgroundMuted tracks any active overlay surface', () => {
  assert.equal(isOverlayBackgroundMuted({ isRecipeSetupSheetOpen: false, isIngredientsSheetOpen: false, isPlanSheetOpen: false }), false);
  assert.equal(isOverlayBackgroundMuted({ isRecipeSetupSheetOpen: true, isIngredientsSheetOpen: false, isPlanSheetOpen: false }), true);
});
