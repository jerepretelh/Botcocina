import type {
  ActiveCompoundTimer,
  CompoundComponentProgress,
  CompoundResolvedTimelineItem,
} from '../../../types';
import type { ScaledRecipeV2 } from '../../types/recipe-v2';
import type { CookingPresentationFrontState, CookingPresentationIntent, CookingPresentationV2 } from '../../types/cooking-presentation-v2';
import { buildCompletionMessage, buildNextStepPreview, resolveCtaLabel } from './cookingPresentationCopy';

export interface BuildCompoundCookingPresentationV2Args {
  recipe: ScaledRecipeV2 | null;
  currentItem: CompoundResolvedTimelineItem | null;
  nextItem: CompoundResolvedTimelineItem | null;
  currentTimelineIndex: number;
  totalTimelineItems: number;
  progressPercent: number;
  activeTimers: ActiveCompoundTimer[];
  componentProgress: CompoundComponentProgress[];
  currentTimer: ActiveCompoundTimer | null;
  isCurrentTimerStarted: boolean;
  isCurrentTimerRunning: boolean;
  isCurrentTimerExpired: boolean;
  isRecipeComplete: boolean;
  inlineMessage: {
    tone: 'info' | 'success';
    title: string;
    body: string;
  } | null;
}

function resolveCompoundIntent(args: BuildCompoundCookingPresentationV2Args): CookingPresentationIntent {
  const { recipe, currentItem, nextItem, currentTimelineIndex, totalTimelineItems, isCurrentTimerStarted, isCurrentTimerExpired, isRecipeComplete } = args;
  if (isRecipeComplete) return 'finish';
  if (currentItem?.durationSeconds != null && !isCurrentTimerStarted) {
    return currentItem.autoAdvanceOnStart ? 'start_and_continue' : 'start_timer';
  }
  if (isCurrentTimerExpired) return 'continue';
  if ((recipe?.batchResolution?.batchCount ?? 1) > 1) {
    const currentText = currentItem?.subStepName?.toLowerCase() ?? '';
    const nextText = nextItem?.subStepName?.toLowerCase() ?? '';
    if ((currentText.includes('tanda') || nextText.includes('tanda')) && currentTimelineIndex < totalTimelineItems - 1) {
      return 'next_batch';
    }
  }
  if (nextItem && nextItem.componentId !== currentItem?.componentId) return 'switch_front';
  if (currentTimelineIndex >= totalTimelineItems - 1) return 'finish';
  return 'continue';
}

function mapFrontState(component: CompoundComponentProgress): CookingPresentationFrontState {
  if (component.isFocused) return 'focused';
  if (component.hasExpiredTimer) return 'expired';
  if (component.hasActiveTimer) return 'running';
  if (component.completedCount >= component.totalCount) return 'done';
  return 'waiting';
}

export function buildCompoundCookingPresentationV2(args: BuildCompoundCookingPresentationV2Args): CookingPresentationV2 {
  const {
    recipe,
    currentItem,
    nextItem,
    currentTimelineIndex,
    totalTimelineItems,
    activeTimers,
    componentProgress,
    currentTimer,
    isCurrentTimerStarted,
    isCurrentTimerRunning,
    isCurrentTimerExpired,
    isRecipeComplete,
    inlineMessage,
  } = args;
  const recipeName = recipe?.name ?? 'receta';
  const ctaIntent = resolveCompoundIntent(args);
  const switchComponentName = ctaIntent === 'switch_front' ? nextItem?.componentName ?? null : null;

  const timerBanner = (() => {
    if (isCurrentTimerExpired) {
      return {
        tone: 'expired' as const,
        title: 'Listo para revisar',
        detail: 'Ya puedes volver a este frente.',
        remainingSeconds: 0,
        timerCount: 1,
      };
    }
    if (isCurrentTimerStarted) {
      const isPaused = !isCurrentTimerRunning;
      return {
        tone: isPaused ? 'background' : 'running',
        title: `${currentItem?.componentName ?? 'Proceso'} en curso`,
        detail: isPaused
          ? 'Temporizador pausado. Reanúdalo cuando quieras continuar.'
          : 'Esto sigue avanzando mientras coordinas otro frente.',
        remainingSeconds: currentTimer?.remainingSeconds ?? null,
        timerCount: 1,
      };
    }
    if (activeTimers.length > 1) {
      return {
        tone: 'background' as const,
        title: `${activeTimers.length} timers activos`,
        detail: 'Hay procesos corriendo en paralelo.',
        timerCount: activeTimers.length,
      };
    }
    if (currentItem?.durationSeconds != null && !isCurrentTimerStarted) {
      return {
        tone: 'idle' as const,
        title: 'Temporizador listo',
        detail: 'Inícialo cuando empieces este frente.',
        remainingSeconds: currentItem.durationSeconds,
        timerCount: 1,
      };
    }
    return null;
  })();

  const summaryParts = [`${componentProgress.length} frentes`, `${totalTimelineItems} subpasos`];
  if ((recipe?.batchResolution?.batchCount ?? 1) > 1) {
    summaryParts.push(`${recipe?.batchResolution?.batchCount} tandas`);
  }

  return {
    primaryTitle: isRecipeComplete
      ? `Listo, quedó tu ${recipeName}`
      : currentItem?.subStepName ?? 'Sigue coordinando la receta',
    supportingText:
      currentItem?.notes?.trim()
      || currentItem?.backgroundHint?.trim()
      || inlineMessage?.body?.trim()
      || null,
    ctaLabel: resolveCtaLabel(ctaIntent, switchComponentName),
    ctaIntent,
    nextStepPreview: isRecipeComplete
      ? null
      : buildNextStepPreview({
          title: nextItem?.subStepName,
          durationSeconds: nextItem?.durationSeconds ?? null,
          displayValue: nextItem?.displayValue ?? null,
          componentName: nextItem?.componentName ?? null,
        }),
    timerBanner,
    backgroundHint: currentItem?.backgroundHint ?? (activeTimers.length > 0 ? 'Tienes procesos corriendo en segundo plano.' : null),
    activeFrontStatus: componentProgress.map((component) => ({
      componentId: component.componentId,
      label: component.name,
      state: mapFrontState(component),
      progressLabel: `${component.completedCount}/${component.totalCount}`,
    })),
    completionMessage: isRecipeComplete
      ? buildCompletionMessage({
          recipeName,
          body: 'Terminaste todos los frentes y ya no quedan timers activos.',
          summary: summaryParts.join(' · '),
        })
      : null,
    stepProgressLabel: isRecipeComplete
      ? 'Receta terminada'
      : `Subpaso ${Math.min(currentTimelineIndex + 1, Math.max(totalTimelineItems, 1))} de ${Math.max(totalTimelineItems, 1)}`,
    componentLabel: currentItem?.componentName ?? null,
  };
}
