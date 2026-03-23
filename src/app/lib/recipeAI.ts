import type { AIRecipeContextDraft, AIUsageMetadata, ClarificationNumberIntent, CookingEquipment } from '../../types/index.js';
import type { IngredientAmountV2, RecipeTimeSummaryV2, RecipeYieldV2, ScalingPolicy } from '../types/recipe-v2.js';
import { authenticatedJsonFetch } from './authenticatedApi.js';

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

export interface AIPreRecipeIngredient {
  name: string;
  emoji?: string;
  amountText: string;
  notes?: string | null;
}

export interface AIPreRecipePhase {
  title: string;
  summary?: string | null;
  actions: string[];
}

export interface AIPreviewMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface AIPreRecipe {
  name: string;
  icon: string;
  description: string;
  chatResponse: string;
  baseYield: RecipeYieldV2;
  ingredients: AIPreRecipeIngredient[];
  phases: AIPreRecipePhase[];
  tips?: string[];
  importantNotes?: string[];
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

export interface AIPreRecipeResult {
  preRecipe: AIPreRecipe;
  usage?: AIUsageMetadata;
}

async function fetchRecipeAI<T>(payload: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120_000);

  try {
    return await authenticatedJsonFetch<T>('/api/ai/recipe', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('La IA tardó demasiado en responder. Estoy pidiendo una prereceta bastante detallada, así que vuelve a intentarlo en unos segundos.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function generatePreRecipeWithAI(args: {
  prompt: string;
  context?: AIRecipeContextDraft;
  messages?: AIPreviewMessage[];
}): Promise<AIPreRecipeResult> {
  return fetchRecipeAI<AIPreRecipeResult>({
    prompt: args.prompt,
    context: args.context,
    messages: args.messages,
    mode: 'preview',
  });
}

export async function generateRecipeWithAI(args: {
  prompt: string;
  preRecipe: AIPreRecipe;
  context?: AIRecipeContextDraft;
  messages?: AIPreviewMessage[];
}): Promise<{
  recipe: GeneratedRecipe;
  usage?: AIUsageMetadata;
}> {
  const payload = await fetchRecipeAI<{ recipe: GeneratedRecipe; usage?: AIUsageMetadata }>({
    prompt: args.prompt,
    context: args.context,
    preRecipe: args.preRecipe,
    messages: args.messages,
    mode: 'generate',
  });

  return payload;
}

export async function requestRecipeClarificationWithAI(
  prompt: string,
  context?: AIRecipeContextDraft,
): Promise<AIClarificationResult> {
  return fetchRecipeAI<AIClarificationResult>({ prompt, context, mode: 'clarify' });
}
