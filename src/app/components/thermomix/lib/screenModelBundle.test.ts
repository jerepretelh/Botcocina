import test from 'node:test';
import assert from 'node:assert/strict';

import { buildThermomixScreenModelBundle } from './screenModelBundle';

test('buildThermomixScreenModelBundle preserves grouped screen models', () => {
  const bundle = buildThermomixScreenModelBundle({
    appShell: { appVersion: '1.0.0' },
    libraryUi: { screen: 'category-select' },
    planningUi: { screen: 'weekly-plan' },
    cookingUi: { screen: 'cooking' },
    overlayUi: { overlayModel: { isBackgroundMuted: false } },
  });

  assert.equal(bundle.libraryUi.screen, 'category-select');
  assert.equal(bundle.planningUi.screen, 'weekly-plan');
  assert.equal(bundle.cookingUi.screen, 'cooking');
  assert.equal(bundle.overlayUi.overlayModel.isBackgroundMuted, false);
});
