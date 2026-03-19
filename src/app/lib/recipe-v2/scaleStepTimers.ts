import type { RecipeStepV2, RecipeYieldV2, ScaledRecipeStepV2, ScaledRecipeSubStepV2, ScalingPolicy } from '../../types/recipe-v2';
import { getYieldScaleFactor } from './containerScaling';
import { formatScaledAmount } from './scaleIngredients';

function scaleTimer(durationSeconds: number, factor: number, policy: ScalingPolicy) {
  switch (policy) {
    case 'fixed':
    case 'non_scalable':
      return durationSeconds;
    case 'gentle':
      return Math.max(15, Math.round(durationSeconds * (1 + ((factor - 1) * 0.45))));
    case 'batch':
      return Math.max(30, Math.round(durationSeconds * Math.max(1, factor)));
    case 'container_dependent':
      return Math.max(30, Math.round(durationSeconds * (1 + ((factor - 1) * 0.7))));
    case 'linear':
    default:
      return Math.max(15, Math.round(durationSeconds * factor));
  }
}

export function scaleStepTimers(
  steps: RecipeStepV2[],
  baseYield: RecipeYieldV2,
  targetYield: RecipeYieldV2,
  options?: {
    timerScaleFactor?: number;
  },
): { steps: ScaledRecipeStepV2[]; scaleFactor: number; warnings: string[] } {
  const scaleFactor = options?.timerScaleFactor ?? getYieldScaleFactor(baseYield, targetYield);
  const warnings: string[] = [];

  return {
    scaleFactor,
    warnings,
    steps: steps.map((step) => ({
      ...step,
      subSteps: step.subSteps.map((subStep): ScaledRecipeSubStepV2 => {
        if (subStep.timer?.durationSeconds != null) {
          const durationSeconds = scaleTimer(subStep.timer.durationSeconds, scaleFactor, subStep.timer.scalingPolicy);
          if (subStep.timer.scalingPolicy === 'container_dependent') {
            warnings.push(`Revisa "${subStep.text}" según el tamano real del recipiente.`);
          }
          return {
            ...subStep,
            displayValue: durationSeconds,
            durationSeconds,
          };
        }

        if (subStep.amount) {
          if (subStep.amount.scalingPolicy === 'container_dependent') {
            warnings.push(`Ajusta "${subStep.text}" según el recipiente real.`);
          }
          return {
            ...subStep,
            displayValue: formatScaledAmount(subStep.amount, scaleFactor),
            durationSeconds: null,
          };
        }

        return {
          ...subStep,
          displayValue: null,
          durationSeconds: null,
        };
      }),
    })),
  };
}
