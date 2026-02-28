import { RecipeStep, SubStep, FaceTimerPair, Portion } from '../../types';

export function parseTimerSeconds(value: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }

  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

export function applyTimerScale(steps: RecipeStep[], factor: number): RecipeStep[] {
  if (Math.abs(factor - 1) < 0.01) return steps;
  return steps.map((step) => ({
    ...step,
    subSteps: step.subSteps.map((subStep) => {
      if (!subStep.isTimer) return subStep;
      return {
        ...subStep,
        portions: {
          1: Math.max(1, Math.round(Number(subStep.portions[1]) * factor)),
          2: Math.max(1, Math.round(Number(subStep.portions[2]) * factor)),
          4: Math.max(1, Math.round(Number(subStep.portions[4]) * factor)),
        },
      };
    }),
  }));
}

export function getFaceTimerPair(step: RecipeStep | undefined, portion: Portion): FaceTimerPair | null {
  if (!step) return null;

  const firstIndex = step.subSteps.findIndex((subStep) => {
    const text = normalizeText(`${subStep.subStepName} ${subStep.notes}`);
    return subStep.isTimer && (text.includes('primera cara') || text.includes('primer lado'));
  });
  const secondIndex = step.subSteps.findIndex((subStep) => {
    const text = normalizeText(`${subStep.subStepName} ${subStep.notes}`);
    return subStep.isTimer && (text.includes('segunda cara') || text.includes('segundo lado'));
  });

  if (firstIndex < 0 || secondIndex <= firstIndex) return null;

  const firstSeconds = parseTimerSeconds(step.subSteps[firstIndex].portions[portion]);
  const secondSeconds = parseTimerSeconds(step.subSteps[secondIndex].portions[portion]);
  if (!firstSeconds || !secondSeconds) return null;

  return { firstIndex, secondIndex, firstSeconds, secondSeconds };
}

