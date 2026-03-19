import type { AIRecipeContextDraft, AIUsageMetadata, ClarificationNumberIntent, CookingEquipment } from '../../types';
import type { IngredientAmountV2, RecipeTimeSummaryV2, RecipeYieldV2, ScalingPolicy } from '../types/recipe-v2';
import { authenticatedJsonFetch } from './authenticatedApi';

export type FireLevel = 'low' | 'medium' | 'high';

export interface GeneratedSubStep {
  subStepName?: string;
  text?: string;
  notes: string;
  portions?: {
    1: string | number;
    2: string | number;
    4: string | number;
  };
  baseValue?: string | number;
  timerScaling?: 'fixed' | 'gentle';
  isTimer: boolean;
  amount?: IngredientAmountV2 | null;
  timer?: {
    durationSeconds: number | null;
    scalingPolicy: ScalingPolicy;
  } | null;
}

export interface GeneratedRecipeStep {
  stepNumber?: number;
  stepName?: string;
  title?: string;
  fireLevel?: FireLevel;
  temperature?: number;
  equipment?: CookingEquipment;
  subSteps: GeneratedSubStep[];
  notes?: string | null;
}

export interface GeneratedIngredient {
  name: string;
  emoji?: string;
  indispensable?: boolean;
  portions?: {
    1: string;
    2: string;
    4: string;
  };
  baseValue?: string;
  amount?: IngredientAmountV2;
  notes?: string | null;
}

export interface GeneratedRecipe {
  id?: string;
  name: string;
  icon: string;
  ingredient: string;
  description: string;
  tip: string;
  baseServings?: number;
  baseYield?: RecipeYieldV2;
  complexity?: 'simple' | 'complex';
  portionLabels?: {
    singular: string;
    plural: string;
  };
  ingredients: GeneratedIngredient[];
  steps: GeneratedRecipeStep[];
  timeSummary?: RecipeTimeSummaryV2 | null;
  experience?: 'standard' | 'compound';
  compoundMeta?: unknown;
  equipment?: CookingEquipment;
}

export interface AIClarificationQuestion {
  id: string;
  question: string;
  type: 'single_choice' | 'number' | 'text';
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  presentationVariant?: 'cards' | 'stepper' | 'textarea';
  emoji?: string;
  section?: string;
  numberIntent?: ClarificationNumberIntent;
}

export interface AIClarificationResult {
  needsClarification: boolean;
  questions: AIClarificationQuestion[];
  suggestedTitle?: string;
  tip?: string;
  usage?: AIUsageMetadata;
}

async function fetchRecipeAI<T>(payload: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);

  try {
    return await authenticatedJsonFetch<T>('/api/ai/recipe', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('La generación tardó demasiado. Revisa tu conexión e inténtalo nuevamente.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function generateRecipeWithAI(prompt: string, context?: AIRecipeContextDraft): Promise<{
  recipe: GeneratedRecipe;
  usage?: AIUsageMetadata;
}> {
  const payload = await fetchRecipeAI<{ recipe: GeneratedRecipe; usage?: AIUsageMetadata }>({ prompt, context });

  return payload;
}

export async function requestRecipeClarificationWithAI(
  prompt: string,
  context?: AIRecipeContextDraft,
): Promise<AIClarificationResult> {
  return fetchRecipeAI<AIClarificationResult>({ prompt, context, mode: 'clarify' });
}
