import type { CookingPresentationIntent } from '../../types/cooking-presentation-v2';
import { resolveCtaLabel } from './cookingPresentationCopy';

export type CookingCompoundPrimaryActionV2Kind =
  | 'start_timer'
  | 'pause_timer'
  | 'continue_step'
  | 'focus_front'
  | 'finish_recipe'
  | 'noop';

export interface CookingCompoundPrimaryActionV2Input {
  intent: CookingPresentationIntent;
  hasCurrentTimer: boolean;
  isCurrentTimerRunning: boolean;
  isCurrentTimerExpired: boolean;
  isRecipeComplete: boolean;
  nextFrontName?: string | null;
}

export interface CookingCompoundPrimaryActionV2 {
  kind: CookingCompoundPrimaryActionV2Kind;
  label: string;
}

export function resolveCompoundPrimaryActionV2(input: CookingCompoundPrimaryActionV2Input): CookingCompoundPrimaryActionV2 {
  if (input.isRecipeComplete) {
    return {
      kind: 'finish_recipe',
      label: resolveCtaLabel('finish'),
    };
  }

  if (input.hasCurrentTimer && !input.isCurrentTimerExpired) {
    if (input.isCurrentTimerRunning) {
      return {
        kind: 'pause_timer',
        label: 'Pausar temporizador',
      };
    }

    return {
      kind: 'pause_timer',
      label: 'Reanudar temporizador',
    };
  }

  if ((input.intent === 'start_timer' || input.intent === 'start_and_continue') && !input.isCurrentTimerExpired) {
    const label = resolveCtaLabel(input.intent);
    return {
      kind: 'start_timer',
      label,
    };
  }

  if (input.intent === 'switch_front') {
    return {
      kind: 'focus_front',
      label: input.nextFrontName ? `Ir al frente de ${input.nextFrontName}` : resolveCtaLabel('switch_front'),
    };
  }

  if (input.intent === 'next_batch') {
    return {
      kind: 'continue_step',
      label: resolveCtaLabel('next_batch'),
    };
  }

  if (input.intent === 'finish') {
    return {
      kind: 'finish_recipe',
      label: resolveCtaLabel('finish'),
    };
  }

  return {
    kind: 'continue_step',
    label: resolveCtaLabel('continue'),
  };
}
