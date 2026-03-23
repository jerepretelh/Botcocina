import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveAutoReminderState,
  resolveCookingPortionValue,
  resolveReminderCopy,
  resolveStandardPrimaryActionState,
  resolveCompoundPrimaryActionState,
} from './cookingAssembly';

test('resolveAutoReminderState detects reminder language in compat substeps', () => {
  const state = resolveAutoReminderState({
    subStepName: 'Recordatorio: mover papas',
    notes: 'Remueve y sigue',
    isTimer: false,
  } as any);

  assert.equal(state.isAutoReminderSubStep, true);
  assert.equal(state.currentSubStepText.includes('mover papas'), true);
});

test('resolveReminderCopy returns fries-specific reminder and retirar copy', () => {
  const reminder = resolveReminderCopy({
    currentSubStep: {
      subStepName: 'Tanda completada',
      notes: 'Segundo tramo listo',
      isTimer: false,
    } as any,
    currentSubStepText: 'tanda completada segundo tramo papa frita',
    isAutoReminderSubStep: false,
    selectedRecipeId: 'papas-fritas',
  });

  assert.equal(reminder.retirarTitle, 'Tanda completada');
  assert.equal(reminder.effectiveReminderTitle, 'Mover nuevamente');
});

test('resolveCookingPortionValue preserves direct timer values and text values', () => {
  assert.equal(
    resolveCookingPortionValue({
      rawResolvedSubStepValue: 12,
      currentSubStep: { isTimer: true, baseValue: 12 } as any,
      setupScaleFactor: 1.5,
    }),
    12,
  );

  assert.equal(
    resolveCookingPortionValue({
      rawResolvedSubStepValue: '2 tazas',
      currentSubStep: { isTimer: false } as any,
      setupScaleFactor: 2,
    }),
    '2 tazas',
  );
});

test('primary action helpers keep standard and compound CTA selection stable', () => {
  assert.deepEqual(
    resolveStandardPrimaryActionState({
      intent: 'start_timer',
      hasTimer: true,
      isRunning: false,
      isExpired: false,
      isRecipeFinished: false,
      totalItems: 4,
      currentIndex: 1,
    }),
    { kind: 'start_timer', label: 'Reanudar' },
  );

  assert.deepEqual(
    resolveCompoundPrimaryActionState({
      intent: 'switch_front',
      hasCurrentTimer: false,
      isCurrentTimerRunning: false,
      isCurrentTimerExpired: false,
      isRecipeComplete: false,
      nextFrontName: 'salsa',
    }),
    { kind: 'focus_front', label: 'Ir al frente de salsa' },
  );
});
