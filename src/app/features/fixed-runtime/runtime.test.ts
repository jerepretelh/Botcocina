import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStepMetaMap, findNextActionableStep, initialTimerState, tickTimers } from './runtime';
import type { FixedRecipeJson } from './types';

const sampleRecipe: FixedRecipeJson = {
  id: 'sample',
  title: 'Sample',
  servings: 4,
  ingredients: [
    {
      title: 'Base',
      items: [{ name: 'item', canonicalName: 'item', shoppingKey: 'item', amount: 1, unit: 'unidad' }],
    },
  ],
  phases: [
    {
      id: 'f1',
      number: 'FASE 1',
      title: 'Inicio',
      steps: [
        { id: 's1', text: 'Paso sin timer' },
        { id: 's2', text: 'Paso con timer', timer: 3 },
        { id: 's3', text: 'Resultado', type: 'result' },
      ],
    },
    {
      id: 'f2',
      number: 'FASE 2',
      title: 'Siguiente',
      steps: [{ id: 's4', text: 'Siguiente accionable' }],
    },
  ],
};

test('initialTimerState creates timers only for timed steps', () => {
  const state = initialTimerState(sampleRecipe);
  assert.deepEqual(Object.keys(state), ['s2']);
  assert.deepEqual(state.s2, {
    duration: 3,
    remaining: 3,
    running: false,
    done: false,
  });
});

test('tickTimers updates running timers and marks done at zero', () => {
  const state = {
    s2: { duration: 3, remaining: 1, running: true, done: false },
  };
  const next = tickTimers(state);
  assert.deepEqual(next.s2, {
    duration: 3,
    remaining: 0,
    running: false,
    done: true,
  });
});

test('findNextActionableStep skips result steps', () => {
  const next = findNextActionableStep(sampleRecipe, 's2');
  assert.equal(next?.id, 's4');
});

test('buildStepMetaMap preserves phase and step indices', () => {
  const map = buildStepMetaMap(sampleRecipe);
  assert.equal(map.s4.phaseIndex, 1);
  assert.equal(map.s4.stepIndex, 0);
});
