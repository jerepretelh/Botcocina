import test from 'node:test';
import assert from 'node:assert/strict';

import type { RecipeV2 } from '../../types/recipe-v2';
import { scaleStepTimers } from './scaleStepTimers';

const kekeRecipe: RecipeV2 = {
  id: 'keke',
  name: 'Keke',
  baseYield: {
    type: 'pan_size',
    value: 1,
    canonicalUnit: null,
    visibleUnit: 'molde mediano',
    label: 'molde mediano',
    unit: 'molde mediano',
    containerKey: 'mold-medium',
    containerMeta: { kind: 'mold', sizeLabel: 'Molde mediano', diameterCm: 22 },
  },
  ingredients: [],
  steps: [{
    id: 'horno',
    title: 'Horno',
    subSteps: [{
      id: 'horno-1',
      text: 'Vierte en un molde mediano engrasado.',
      amount: {
        value: null,
        canonicalUnit: null,
        visibleUnit: null,
        family: 'container',
        text: 'Molde mediano',
        scalable: true,
        scalingPolicy: 'container_dependent',
        unit: null,
      },
      timer: null,
    }],
    notes: null,
    activeMinutes: null,
    passiveMinutes: null,
  }],
  timeSummary: { prepMinutes: 5, cookMinutes: 40, totalMinutes: 45 },
  scalingModel: 'container_bound',
};

test('scaleStepTimers reflects selected mold in visible narrative for container-bound recipes', () => {
  const selectedYield = {
    ...kekeRecipe.baseYield,
    containerKey: 'mold-large',
    containerMeta: { kind: 'mold' as const, sizeLabel: 'Molde grande', diameterCm: 26 },
    label: 'molde grande',
    visibleUnit: 'molde grande',
    unit: 'molde grande',
  };

  const result = scaleStepTimers(kekeRecipe.steps, kekeRecipe.baseYield, selectedYield, {
    recipe: kekeRecipe,
  });

  assert.equal(result.steps[0]?.subSteps[0]?.text, 'Vierte en un molde grande engrasado.');
  assert.equal(result.steps[0]?.subSteps[0]?.displayValue, 'Molde grande');
});
