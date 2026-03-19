import type { ScaledRecipeStepV2, ScaledRecipeSubStepV2, ScaledRecipeV2 } from '../../types/recipe-v2';
import type { CookingPresentationV2, CookingPresentationIntent } from '../../types/cooking-presentation-v2';
import { buildCompletionMessage, buildNextStepPreview, resolveCtaLabel } from './cookingPresentationCopy';

export interface BuildCookingPresentationV2Args {
  recipe: ScaledRecipeV2 | null;
  currentStep: ScaledRecipeStepV2 | null;
  currentSubStep: ScaledRecipeSubStepV2 | null;
  nextStep: ScaledRecipeSubStepV2 | null;
  currentIndex: number;
  totalItems: number;
  progressPercent: number;
  isRecipeFinished: boolean;
  timer: {
    hasTimer: boolean;
    isRunning: boolean;
    isExpired: boolean;
    timeRemaining: number;
  };
}

function resolveStandardIntent(args: BuildCookingPresentationV2Args): CookingPresentationIntent {
  const { recipe, currentSubStep, currentIndex, totalItems, isRecipeFinished, timer } = args;

  if (isRecipeFinished) return 'finish';
  if (timer.isExpired) return 'continue';
  if (recipe?.batchResolution && recipe.batchResolution.batchCount > 1) {
    const currentText = currentSubStep?.text?.toLowerCase() ?? '';
    const hasBatchHint = currentText.includes('tanda');
    const hasRemaining = currentIndex < totalItems - 1;
    if (hasBatchHint && hasRemaining) return 'next_batch';
  }
  if (timer.hasTimer && !timer.isRunning && !timer.isExpired) return 'start_timer';
  if (currentIndex >= totalItems - 1) return 'finish';
  return 'continue';
}

export function buildCookingPresentationV2(args: BuildCookingPresentationV2Args): CookingPresentationV2 {
  const { recipe, currentStep, currentSubStep, nextStep, currentIndex, totalItems, isRecipeFinished, timer } = args;
  const recipeName = recipe?.name ?? 'receta';
  const ctaIntent = resolveStandardIntent(args);

  const timerBanner = (() => {
    if (!timer.hasTimer && currentSubStep?.durationSeconds == null) return null;
    if (timer.isExpired) {
      return {
        tone: 'expired' as const,
        title: 'Listo para revisar',
        detail: 'El tiempo ya terminó. Puedes continuar cuando quieras.',
        remainingSeconds: 0,
        timerCount: 1,
      };
    }
    if (timer.isRunning) {
      return {
        tone: 'running' as const,
        title: 'En curso',
        detail: 'Sigue este paso y deja que el timer marque el ritmo.',
        remainingSeconds: timer.timeRemaining,
        timerCount: 1,
      };
    }
    if (timer.hasTimer) {
      return {
        tone: 'idle' as const,
        title: 'Temporizador listo',
        detail: 'Inícialo cuando empieces este paso.',
        remainingSeconds: timer.timeRemaining,
        timerCount: 1,
      };
    }
    return null;
  })();

  const summaryParts = [`${totalItems} pasos`];
  if ((recipe?.batchResolution?.batchCount ?? 1) > 1) {
    summaryParts.push(`${recipe?.batchResolution?.batchCount} tandas`);
  }

  return {
    primaryTitle: isRecipeFinished
      ? `Listo, quedó tu ${recipeName}`
      : currentSubStep?.text?.trim() || 'Continúa con la receta',
    supportingText:
      currentSubStep?.notes?.trim()
      || currentStep?.notes?.trim()
      || (timer.isRunning ? 'Déjalo avanzar y sigue el ritmo de la receta.' : null),
    ctaLabel: resolveCtaLabel(ctaIntent),
    ctaIntent,
    nextStepPreview: isRecipeFinished
      ? null
      : buildNextStepPreview({
          title: nextStep?.text,
          durationSeconds: nextStep?.durationSeconds ?? null,
          displayValue: nextStep?.displayValue ?? null,
        }),
    timerBanner,
    backgroundHint:
      (recipe?.batchResolution?.batchCount ?? 1) > 1
        ? `Esta receta se resolverá en ${recipe?.batchResolution?.batchCount} tandas.`
        : null,
    activeFrontStatus: [
      {
        componentId: recipe?.id ?? 'recipe',
        label: recipe?.name ?? 'Receta',
        state: isRecipeFinished ? 'done' : timer.isRunning ? 'running' : 'focused',
        progressLabel: totalItems > 0 ? `${Math.min(currentIndex + 1, totalItems)}/${totalItems}` : null,
      },
    ],
    completionMessage: isRecipeFinished
      ? buildCompletionMessage({
          recipeName,
          body: 'Terminaste todos los pasos y ya no quedan timers activos.',
          summary: summaryParts.join(' · '),
        })
      : null,
    stepProgressLabel: isRecipeFinished
      ? 'Receta terminada'
      : totalItems > 0
        ? `Paso ${Math.min(currentIndex + 1, totalItems)} de ${totalItems}`
        : null,
    componentLabel: recipe?.name ?? null,
  };
}
