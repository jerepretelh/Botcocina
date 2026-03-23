import type { SubStep } from '../../../../types';
import { resolveCookingPrimaryActionV2 } from '../../../lib/presentation/resolveCookingPrimaryActionV2';
import { resolveCompoundPrimaryActionV2 } from '../../../lib/presentation/resolveCompoundPrimaryActionV2';

export function resolveAutoReminderState(currentSubStep: SubStep | null) {
  const currentSubStepText = `${currentSubStep?.subStepName ?? ''} ${currentSubStep?.notes ?? ''}`.toLowerCase();
  const isAutoReminderSubStep = Boolean(
    currentSubStep &&
    !currentSubStep.isTimer &&
    (
      currentSubStepText.includes('recordatorio')
      || currentSubStepText.includes('mueve')
      || currentSubStepText.includes('mover')
      || currentSubStepText.includes('remueve')
      || currentSubStepText.includes('remover')
      || currentSubStepText.includes('revuelve')
      || currentSubStepText.includes('revolver')
      || currentSubStepText.includes('voltea')
      || currentSubStepText.includes('voltear')
      || currentSubStepText.includes('gira')
      || currentSubStepText.includes('girar')
      || currentSubStepText.includes('dar vuelta')
      || currentSubStepText.includes('redistribuye')
      || currentSubStepText.includes('redistribuir')
      || currentSubStepText.includes('stir')
      || currentSubStepText.includes('flip')
      || currentSubStepText.includes('turn')
    )
  );

  const isRetirarSubStep = Boolean(
    currentSubStep &&
    !currentSubStep.isTimer &&
    (
      currentSubStep.subStepName.toLowerCase().includes('retirar')
      || currentSubStep.subStepName.toLowerCase().includes('tanda completada')
    )
  );

  return {
    currentSubStepText,
    isAutoReminderSubStep,
    isRetirarSubStep,
  };
}

export function resolveReminderCopy(args: {
  currentSubStep: SubStep | null;
  currentSubStepText: string;
  isAutoReminderSubStep: boolean;
  selectedRecipeId: string | null;
}) {
  const retirarIsEgg = args.currentSubStepText.includes('huevo');
  const retirarIsFries = args.selectedRecipeId === 'papas-fritas' && args.currentSubStepText.includes('tanda completada');
  const retirarTitle = retirarIsEgg ? 'El huevo está listo' : retirarIsFries ? 'Tanda completada' : 'Pieza completada';
  const retirarMessage = retirarIsEgg
    ? 'Retira tu huevo y prepárate para el siguiente.'
    : retirarIsFries
      ? 'Retira las papas, escurre y continúa con la siguiente tanda.'
      : 'Retira la pieza y prepárate para la siguiente.';

  const stirPromptTitle = args.currentSubStepText.includes('papa') || args.currentSubStepText.includes('frita')
    ? (args.currentSubStepText.includes('segundo tramo') ? 'Mover nuevamente' : 'Mover papas')
    : 'Recordatorio';

  const stirPromptMessage = args.currentSubStepText.includes('papa') || args.currentSubStepText.includes('frita')
    ? (args.currentSubStepText.includes('segundo tramo') ? 'Vuelve a mover para terminar de dorar parejo.' : 'Remueve y separa para evitar que se peguen.')
    : 'Realiza el giro o movimiento indicado antes del siguiente tramo.';

  return {
    retirarTitle,
    retirarMessage,
    effectiveReminderTitle: args.isAutoReminderSubStep
      ? args.currentSubStep?.subStepName.replace(/^Recordatorio:\s*/i, 'Recordatorio')
      : stirPromptTitle,
    effectiveReminderMessage: args.isAutoReminderSubStep
      ? args.currentSubStep?.notes || 'Realiza la acción indicada antes de continuar.'
      : stirPromptMessage,
    showFlipHint: Boolean(args.currentSubStep?.notes?.toLowerCase().includes('voltear') || args.currentSubStepText.includes('dar vuelta')),
    showStirHint: Boolean(args.currentSubStep?.isTimer && (args.currentSubStepText.includes('dorar') || args.currentSubStepText.includes('freir'))),
  };
}

export function resolveCookingPortionValue(args: {
  rawResolvedSubStepValue: number | string | null;
  currentSubStep: SubStep | null;
  setupScaleFactor: number;
}) {
  if (!args.currentSubStep) return null;
  if (!args.currentSubStep.isTimer) {
    return typeof args.rawResolvedSubStepValue === 'string' ? args.rawResolvedSubStepValue : null;
  }

  if (typeof args.rawResolvedSubStepValue !== 'number') return null;
  return args.currentSubStep.baseValue != null
    ? args.rawResolvedSubStepValue
    : Math.round(args.rawResolvedSubStepValue * args.setupScaleFactor);
}

export function resolveStandardPrimaryActionState(args: {
  intent: Parameters<typeof resolveCookingPrimaryActionV2>[0]['intent'];
  hasTimer: boolean;
  isRunning: boolean;
  isExpired: boolean;
  isRecipeFinished: boolean;
  totalItems: number;
  currentIndex: number;
}) {
  return resolveCookingPrimaryActionV2({
    intent: args.intent,
    hasTimer: args.hasTimer,
    isRunning: args.isRunning,
    isExpired: args.isExpired,
    isRecipeFinished: args.isRecipeFinished,
    isLastSubStep: args.totalItems > 0 && args.currentIndex >= args.totalItems - 1,
  });
}

export function resolveCompoundPrimaryActionState(args: Parameters<typeof resolveCompoundPrimaryActionV2>[0]) {
  return resolveCompoundPrimaryActionV2(args);
}
