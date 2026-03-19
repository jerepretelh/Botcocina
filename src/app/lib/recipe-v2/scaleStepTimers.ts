import type {
  CookingContextV2,
  RecipeStepV2,
  RecipeV2,
  RecipeYieldV2,
  ScaledRecipeStepV2,
  ScaledRecipeSubStepV2,
  ScalingPolicy,
} from '../../types/recipe-v2';
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

function replaceInsensitive(text: string, search: string, replacement: string) {
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'i'), replacement);
}

function formatContainerPhrase(label: string) {
  const normalized = label.trim();
  if (!normalized) return null;
  const lower = normalized.toLowerCase();
  if (lower.startsWith('molde')) return `el ${lower}`;
  if (lower.startsWith('bandeja')) return `la ${lower}`;
  if (lower.startsWith('canasta')) return `la ${lower}`;
  return normalized;
}

function resolveContainerNarrative(args: {
  recipe?: RecipeV2 | null;
  targetYield: RecipeYieldV2;
  cookingContext?: CookingContextV2 | null;
  subStep: RecipeStepV2['subSteps'][number];
}) {
  const { recipe, targetYield, cookingContext, subStep } = args;
  const text = subStep.text;
  const amountText = subStep.amount?.text ?? null;
  const recipeUsesAirfryer = Boolean(recipe?.steps.some((step) => step.equipment === 'airfryer'));

  if ((targetYield.type === 'pan_size' || targetYield.type === 'tray_size') && subStep.amount?.scalingPolicy === 'container_dependent') {
    const selectedLabel = targetYield.containerMeta?.sizeLabel ?? targetYield.label ?? targetYield.visibleUnit ?? null;
    const baseLabel = recipe?.baseYield.containerMeta?.sizeLabel ?? recipe?.baseYield.label ?? recipe?.baseYield.visibleUnit ?? null;
    if (!selectedLabel) {
      return { text, amountText };
    }

    return {
      text: baseLabel ? replaceInsensitive(text, baseLabel, selectedLabel.toLowerCase()) : text,
      amountText: selectedLabel,
    };
  }

  if (recipeUsesAirfryer && subStep.amount?.scalingPolicy === 'container_dependent') {
    const selectedLabel = cookingContext?.selectedContainerMeta?.sizeLabel ?? recipe?.cookingContextDefaults?.selectedContainerMeta?.sizeLabel ?? null;
    if (!selectedLabel) {
      return { text, amountText };
    }

    const selectedPhrase = formatContainerPhrase(selectedLabel);
    const nextText = /canasta/i.test(text) && selectedPhrase
      ? replaceInsensitive(text, 'la canasta', selectedPhrase)
      : text;

    return {
      text: nextText,
      amountText: selectedLabel,
    };
  }

  return { text, amountText };
}

export function scaleStepTimers(
  steps: RecipeStepV2[],
  baseYield: RecipeYieldV2,
  targetYield: RecipeYieldV2,
  options?: {
    recipe?: RecipeV2 | null;
    cookingContext?: CookingContextV2 | null;
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
        const containerNarrative = resolveContainerNarrative({
          recipe: options?.recipe,
          targetYield,
          cookingContext: options?.cookingContext,
          subStep,
        });

        if (subStep.timer?.durationSeconds != null) {
          const durationSeconds = scaleTimer(subStep.timer.durationSeconds, scaleFactor, subStep.timer.scalingPolicy);
          if (subStep.timer.scalingPolicy === 'container_dependent') {
            warnings.push(`Revisa "${subStep.text}" según el tamano real del recipiente.`);
          }
          return {
            ...subStep,
            text: containerNarrative.text,
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
            text: containerNarrative.text,
            amount: containerNarrative.amountText == null
              ? subStep.amount
              : {
                  ...subStep.amount,
                  text: containerNarrative.amountText,
                },
            displayValue: containerNarrative.amountText ?? formatScaledAmount(subStep.amount, scaleFactor),
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
