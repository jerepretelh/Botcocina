import type { FixedRecipeJson, FixedRecipeStep, FixedRecipeStepMeta, FixedTimerState } from './types';

export function buildStepMetaMap(recipe: FixedRecipeJson): Record<string, FixedRecipeStepMeta> {
  const map: Record<string, FixedRecipeStepMeta> = {};

  recipe.phases.forEach((phase, phaseIndex) => {
    phase.steps.forEach((step, stepIndex) => {
      map[step.id] = {
        ...step,
        phaseId: phase.id,
        phaseTitle: phase.title,
        phaseNumber: phase.number,
        phaseEmoji: phase.emoji ?? null,
        phaseIndex,
        stepIndex,
      };
    });
  });

  return map;
}

export function initialTimerState(recipe: FixedRecipeJson): Record<string, FixedTimerState> {
  const state: Record<string, FixedTimerState> = {};
  recipe.phases.forEach((phase) => {
    phase.steps.forEach((step) => {
      if (typeof step.timer === 'number' && step.timer > 0) {
        state[step.id] = {
          duration: step.timer,
          remaining: step.timer,
          running: false,
          done: false,
        };
      }
    });
  });
  return state;
}

export function tickTimers(state: Record<string, FixedTimerState>): Record<string, FixedTimerState> {
  let changed = false;
  const next: Record<string, FixedTimerState> = { ...state };

  Object.entries(state).forEach(([id, timer]) => {
    if (!timer.running) return;
    changed = true;
    const nextRemaining = Math.max(0, timer.remaining - 1);
    next[id] = {
      ...timer,
      remaining: nextRemaining,
      running: nextRemaining === 0 ? false : timer.running,
      done: nextRemaining === 0 ? true : timer.done,
    };
  });

  return changed ? next : state;
}

export function findNextActionableStep(recipe: FixedRecipeJson, currentStepId: string): FixedRecipeStep | null {
  const stepMetaMap = buildStepMetaMap(recipe);
  const currentMeta = stepMetaMap[currentStepId];
  if (!currentMeta) return null;

  for (let phaseIndex = currentMeta.phaseIndex; phaseIndex < recipe.phases.length; phaseIndex += 1) {
    const phase = recipe.phases[phaseIndex];
    const startIndex = phaseIndex === currentMeta.phaseIndex ? currentMeta.stepIndex + 1 : 0;

    for (let stepIndex = startIndex; stepIndex < phase.steps.length; stepIndex += 1) {
      const step = phase.steps[stepIndex];
      if (step.type === 'result') continue;
      return step;
    }
  }

  return null;
}
