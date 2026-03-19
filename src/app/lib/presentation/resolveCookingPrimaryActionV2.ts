import type { CookingPresentationIntent } from '../../types/cooking-presentation-v2';

export type CookingPrimaryActionV2Kind =
  | 'start_timer'
  | 'pause_timer'
  | 'continue_step'
  | 'finish_recipe'
  | 'noop';

export interface CookingPrimaryActionV2Input {
  intent: CookingPresentationIntent;
  hasTimer: boolean;
  isRunning: boolean;
  isExpired: boolean;
  isRecipeFinished: boolean;
  isLastSubStep: boolean;
}

export interface CookingPrimaryActionV2 {
  kind: CookingPrimaryActionV2Kind;
  label: string;
}

export function resolveCookingPrimaryActionV2(input: CookingPrimaryActionV2Input): CookingPrimaryActionV2 {
  if (input.isRecipeFinished) {
    return {
      kind: 'finish_recipe',
      label: 'Terminar receta',
    };
  }

  if (input.isExpired) {
    if (input.isLastSubStep && !input.isRecipeFinished) {
      return {
        kind: 'finish_recipe',
        label: 'Terminar receta',
      };
    }

    return {
      kind: 'continue_step',
      label: input.intent === 'next_batch' ? 'Siguiente tanda' : 'Siguiente',
    };
  }

  if (!input.hasTimer) {
    if (input.isLastSubStep && !input.isRecipeFinished) {
      return {
        kind: 'finish_recipe',
        label: 'Terminar receta',
      };
    }

    return {
      kind: input.intent === 'next_batch' ? 'continue_step' : 'continue_step',
      label: input.intent === 'next_batch' ? 'Siguiente tanda' : 'Siguiente',
    };
  }

  if (input.intent === 'start_timer' && !input.isRunning && !input.isExpired) {
    return {
      kind: 'start_timer',
      label: 'Reanudar',
    };
  }

  if (input.isRunning) {
    return {
      kind: 'pause_timer',
      label: 'Pausar',
    };
  }

  return {
    kind: input.intent === 'next_batch' ? 'continue_step' : 'continue_step',
    label: input.intent === 'next_batch' ? 'Siguiente tanda' : 'Siguiente',
  };
}
