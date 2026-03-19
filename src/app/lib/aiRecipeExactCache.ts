import type { Recipe, RecipeContent } from '../../types';

type ExactRecipeCachePayload = {
  version: 1;
  basePortions: number | null;
  baseServings: number | null;
  aiComplexity?: 'simple' | 'complex';
  ingredientBaseValues: Array<string | null>;
  subStepBaseValues: Array<Array<string | number | null>>;
  subStepTimerScaling: Array<Array<'fixed' | 'gentle' | null>>;
};

const PREFIX = 'ai_recipe_exact_cache_v1:';

function getKey(recipeId: string) {
  return `${PREFIX}${recipeId}`;
}

export function saveAIRecipeExactCache(recipe: Recipe, content: RecipeContent): void {
  if (typeof window === 'undefined') return;
  const hasExactData = Boolean(recipe.basePortions || content.baseServings);
  if (!recipe.id || !hasExactData) return;

  const payload: ExactRecipeCachePayload = {
    version: 1,
    basePortions: recipe.basePortions ?? null,
    baseServings: content.baseServings ?? null,
    aiComplexity: content.aiComplexity,
    ingredientBaseValues: content.ingredients.map((ingredient) => ingredient.baseValue ?? null),
    subStepBaseValues: content.steps.map((step) => step.subSteps.map((subStep) => subStep.baseValue ?? null)),
    subStepTimerScaling: content.steps.map((step) => step.subSteps.map((subStep) => subStep.timerScaling ?? null)),
  };

  window.localStorage.setItem(getKey(recipe.id), JSON.stringify(payload));
}

export function hydrateAIRecipeExactCache(recipe: Recipe, content: RecipeContent): { recipe: Recipe; content: RecipeContent } {
  if (typeof window === 'undefined' || !recipe.id) return { recipe, content };
  const raw = window.localStorage.getItem(getKey(recipe.id));
  if (!raw) return { recipe, content };

  try {
    const parsed = JSON.parse(raw) as ExactRecipeCachePayload;
    return {
      recipe: {
        ...recipe,
        basePortions: parsed.basePortions ?? recipe.basePortions,
      },
      content: {
        ...content,
        baseServings: parsed.baseServings ?? content.baseServings,
        aiComplexity: parsed.aiComplexity ?? content.aiComplexity,
        ingredients: content.ingredients.map((ingredient, index) => ({
          ...ingredient,
          baseValue: parsed.ingredientBaseValues[index] ?? ingredient.baseValue,
        })),
        steps: content.steps.map((step, stepIndex) => ({
          ...step,
          subSteps: step.subSteps.map((subStep, subStepIndex) => ({
            ...subStep,
            baseValue: parsed.subStepBaseValues[stepIndex]?.[subStepIndex] ?? subStep.baseValue,
            timerScaling: parsed.subStepTimerScaling[stepIndex]?.[subStepIndex] ?? subStep.timerScaling,
          })),
        })),
      },
    };
  } catch {
    return { recipe, content };
  }
}
