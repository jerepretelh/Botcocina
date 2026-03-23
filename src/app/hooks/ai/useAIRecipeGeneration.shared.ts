import type { Dispatch, SetStateAction } from 'react';
import type {
  AmountUnit,
  AIRecipeContextDraft,
  CookingContextV2,
  Portion,
  QuantityMode,
  Recipe,
  RecipeCategoryId,
  RecipeContent,
  RecipeStep,
  Screen,
  StepLoopState,
} from '../../types';
import type { AIClarificationQuestion } from '../../lib/recipeAI';
import { normalizeText, inferClarificationNumberIntent } from '../../utils/recipeHelpers';
import type { useAIClarifications } from '../useAIClarifications';
import type { CanonicalRecipeV2 } from '../../lib/recipe-v2/canonicalRecipeV2';
import type { RecipeYieldV2 } from '../../types/recipe-v2';

export type AIClarificationsController = ReturnType<typeof useAIClarifications>;
type Setter<T> = Dispatch<SetStateAction<T>>;

export interface UseAIRecipeGenerationDeps {
  availableRecipes: Recipe[];
  recipeContentById: Record<string, RecipeContent>;
  setAvailableRecipes: Setter<Recipe[]>;
  setRecipeContentById: Setter<Record<string, RecipeContent>>;
  setIngredientSelectionByRecipe: Setter<Record<string, Record<string, boolean>>>;
  setSelectedCategory: (category: RecipeCategoryId | null) => void;
  setSelectedRecipe: (recipe: Recipe | null) => void;
  setScreen: (screen: Screen) => void;
  setIngredientsBackScreen: (screen: Screen) => void;
  setCookingSteps: (steps: RecipeStep[] | null) => void;
  setQuantityMode: (mode: QuantityMode) => void;
  setAmountUnit: (unit: AmountUnit) => void;
  setAvailableCount: (count: number) => void;
  setPortion: (portion: Portion) => void;
  setPeopleCount: (count: number) => void;
  setTargetYield: (targetYield: RecipeYieldV2 | null) => void;
  setCookingContext: (context: CookingContextV2 | null) => void;
  setTimerScaleFactor: (value: number) => void;
  setTimingAdjustedLabel: (value: string) => void;
  setCurrentStepIndex: (value: number) => void;
  setCurrentSubStepIndex: (value: number) => void;
  setIsRunning: (value: boolean) => void;
  setActiveStepLoop: (loop: StepLoopState | null) => void;
  setFlipPromptVisible: (value: boolean) => void;
  setPendingFlipAdvance: (value: boolean) => void;
  setFlipPromptCountdown: (value: number) => void;
  setStirPromptVisible: (value: boolean) => void;
  setPendingStirAdvance: (value: boolean) => void;
  setStirPromptCountdown: (value: number) => void;
  setAwaitingNextUnitConfirmation: (value: boolean) => void;
  aiUserId?: string | null;
  addRecipeToDefaultList?: (recipeId: string) => Promise<void>;
  setRecipeV2ById?: (recipeId: string, recipe: CanonicalRecipeV2) => void;
}

export function buildPromptWithContext(context: AIRecipeContextDraft): string {
  const prompt = context.prompt.trim();
  if (!prompt) return '';

  const lines = [prompt];
  if (typeof context.servings === 'number' && context.servings > 0) {
    lines.push(`- Comensales objetivo: ${context.servings}`);
  }
  if (context.availableIngredients.length > 0) {
    lines.push(`- Ingredientes disponibles: ${context.availableIngredients.map((item) => item.value).join(', ')}`);
  }
  if (context.avoidIngredients.length > 0) {
    lines.push(`- Ingredientes a evitar: ${context.avoidIngredients.map((item) => item.value).join(', ')}`);
  }
  return lines.join('\n');
}

export function isQuestionSatisfiedByContext(question: AIClarificationQuestion, context: AIRecipeContextDraft): boolean {
  const text = normalizeText(`${question.id} ${question.question}`);

  if (question.type === 'number' && inferClarificationNumberIntent(question) === 'servings') {
    return typeof context.servings === 'number' && context.servings > 0;
  }

  if (
    (text.includes('persona') || text.includes('comensal') || text.includes('porcion') || text.includes('porción')) &&
    typeof context.servings === 'number' &&
    context.servings > 0
  ) {
    return true;
  }

  if (
    (text.includes('ingredientes disponibles') ||
      text.includes('que tienes') ||
      text.includes('qué tienes') ||
      text.includes('tienes en casa') ||
      text.includes('disponible')) &&
    context.availableIngredients.length > 0
  ) {
    return true;
  }

  if (
    (text.includes('evitar') ||
      text.includes('alerg') ||
      text.includes('restric') ||
      text.includes('no quieres') ||
      text.includes('disgusto')) &&
    context.avoidIngredients.length > 0
  ) {
    return true;
  }

  return false;
}
