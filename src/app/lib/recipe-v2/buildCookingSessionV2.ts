import type { ScaledRecipeStepV2, ScaledRecipeSubStepV2, ScaledRecipeV2 } from '../../types/recipe-v2';

export interface CookingSessionItemV2 {
  id: string;
  flatIndex: number;
  stepIndex: number;
  subStepIndex: number;
  step: ScaledRecipeStepV2;
  subStep: ScaledRecipeSubStepV2;
}

export interface CookingSessionV2 {
  items: CookingSessionItemV2[];
  totalItems: number;
}

export function buildCookingSessionV2(recipe: ScaledRecipeV2 | null): CookingSessionV2 {
  if (!recipe) {
    return {
      items: [],
      totalItems: 0,
    };
  }

  const batchCount = recipe.batchResolution?.batchCount ?? 1;
  const expandedSteps = recipe.steps.flatMap((step) => {
    const requiresBatchRepeat = batchCount > 1
      && step.subSteps.some((subStep) => subStep.timer?.scalingPolicy === 'batch');
    if (!requiresBatchRepeat) return [step];
    return Array.from({ length: batchCount }, (_, batchIndex) => ({
      ...step,
      id: `${step.id}:batch-${batchIndex + 1}`,
      title: `${step.title} · Tanda ${batchIndex + 1}/${batchCount}`,
      subSteps: step.subSteps.map((subStep) => ({
        ...subStep,
        id: `${subStep.id}:batch-${batchIndex + 1}`,
        text: `${subStep.text}${subStep.timer?.scalingPolicy === 'batch' || subStep.amount?.scalingPolicy === 'container_dependent'
          ? ` (tanda ${batchIndex + 1}/${batchCount})`
          : ''}`,
      })),
    }));
  });

  const items = expandedSteps.flatMap((step, stepIndex) =>
    step.subSteps.map((subStep, subStepIndex, subSteps) => ({
      id: `${recipe.id}:${step.id}:${subStep.id}`,
      flatIndex: 0,
      stepIndex,
      subStepIndex,
      step: {
        ...step,
        subSteps,
      },
      subStep,
    })),
  ).map((item, flatIndex) => ({
    ...item,
    flatIndex,
  }));

  return {
    items,
    totalItems: items.length,
  };
}
