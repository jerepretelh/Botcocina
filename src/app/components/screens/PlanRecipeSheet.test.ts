import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldShowPlanYieldStepper } from './PlanRecipeSheet';

test('PlanRecipeSheet hides +/- controls for container-bound yields', () => {
  assert.equal(shouldShowPlanYieldStepper({
    type: 'pan_size',
    value: 1,
    canonicalUnit: null,
    visibleUnit: 'molde mediano',
    label: 'molde mediano',
    unit: 'molde mediano',
    containerMeta: { kind: 'mold', sizeLabel: 'Molde mediano', diameterCm: 22 },
  }), false);

  assert.equal(shouldShowPlanYieldStepper({
    type: 'tray_size',
    value: 1,
    canonicalUnit: null,
    visibleUnit: 'bandeja mediana',
    label: 'bandeja mediana',
    unit: 'bandeja mediana',
    containerMeta: { kind: 'tray', sizeLabel: 'Bandeja mediana', capacityMl: 3500 },
  }), false);
});
