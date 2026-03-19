import test from 'node:test';
import assert from 'node:assert/strict';

import type { CookingContextV2, RecipeStepV2, RecipeV2, RecipeYieldV2 } from '../../types/recipe-v2';
import { scaleStepTimers } from './scaleStepTimers';

const baseTimeSummary = {
  prepMinutes: 10,
  cookMinutes: 20,
  totalMinutes: 30,
};

test('scaleStepTimers reflects selected pan container label in container-bound narrative', () => {
  const recipe: RecipeV2 = {
    id: 'keke-test',
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
    steps: [],
    timeSummary: baseTimeSummary,
    scalingModel: 'container_bound',
  };

  const steps: RecipeStepV2[] = [
    {
      id: 'hornear',
      title: 'Hornear',
      subSteps: [
        {
          id: 'hornear-1',
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
        },
      ],
    },
  ];

  const selectedYield: RecipeYieldV2 = {
    ...recipe.baseYield,
    containerKey: 'mold-large',
    containerMeta: { kind: 'mold', sizeLabel: 'Molde grande', diameterCm: 26 },
    label: 'Molde grande',
    visibleUnit: 'Molde grande',
    unit: 'Molde grande',
  };

  const result = scaleStepTimers(steps, recipe.baseYield, selectedYield, { recipe });
  const subStep = result.steps[0].subSteps[0];

  assert.equal(subStep.text, 'Vierte en un molde grande engrasado.');
  assert.equal(subStep.displayValue, 'Molde grande');
});

test('scaleStepTimers reflects selected airfryer basket in operational narrative', () => {
  const recipe: RecipeV2 = {
    id: 'papas-test',
    name: 'Papas',
    baseYield: {
      type: 'servings',
      value: 2,
      canonicalUnit: 'servings',
      visibleUnit: 'porciones',
      label: 'porciones',
      unit: 'porciones',
    },
    ingredients: [],
    steps: [
      {
        id: 'coccion',
        title: 'Coccion',
        equipment: 'airfryer',
        subSteps: [],
      },
    ],
    timeSummary: baseTimeSummary,
    cookingContextDefaults: {
      selectedContainerKey: 'basket-medium',
      selectedContainerMeta: { kind: 'basket', sizeLabel: 'Canasta mediana', capacityMl: 3500 },
    },
  };

  const steps: RecipeStepV2[] = [
    {
      id: 'coccion',
      title: 'Coccion',
      equipment: 'airfryer',
      subSteps: [
        {
          id: 'coccion-1',
          text: 'Distribuye en la canasta sin amontonar.',
          amount: {
            value: null,
            canonicalUnit: null,
            visibleUnit: null,
            family: 'container',
            text: 'Canasta mediana',
            scalable: true,
            scalingPolicy: 'container_dependent',
            unit: null,
          },
          timer: null,
        },
      ],
    },
  ];

  const cookingContext: CookingContextV2 = {
    selectedContainerKey: 'basket-large',
    selectedContainerMeta: { kind: 'basket', sizeLabel: 'Canasta grande', capacityMl: 5000 },
  };

  const result = scaleStepTimers(steps, recipe.baseYield, recipe.baseYield, { recipe, cookingContext });
  const subStep = result.steps[0].subSteps[0];

  assert.equal(subStep.text, 'Distribuye en la canasta grande sin amontonar.');
  assert.equal(subStep.displayValue, 'Canasta grande');
});
