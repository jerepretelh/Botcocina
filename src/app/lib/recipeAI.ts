import type { AIRecipeContextDraft, AIUsageMetadata, ClarificationNumberIntent, CookingEquipment } from '../../types';
import { authenticatedJsonFetch } from './authenticatedApi';

export type FireLevel = 'low' | 'medium' | 'high';

export interface GeneratedSubStep {
  subStepName: string;
  notes: string;
  portions: {
    1: string | number;
    2: string | number;
    4: string | number;
  };
  isTimer: boolean;
}

export interface GeneratedRecipeStep {
  stepNumber: number;
  stepName: string;
  fireLevel?: FireLevel;
  temperature?: number;
  equipment?: CookingEquipment;
  subSteps: GeneratedSubStep[];
}

export interface GeneratedIngredient {
  name: string;
  emoji: string;
  indispensable?: boolean;
  portions: {
    1: string;
    2: string;
    4: string;
  };
}

export interface GeneratedRecipe {
  id?: string;
  name: string;
  icon: string;
  ingredient: string;
  description: string;
  tip: string;
  portionLabels?: {
    singular: string;
    plural: string;
  };
  ingredients: GeneratedIngredient[];
  steps: GeneratedRecipeStep[];
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

export async function generateRecipeWithAI(prompt: string, context?: AIRecipeContextDraft): Promise<{
  recipe: GeneratedRecipe;
  usage?: AIUsageMetadata;
}> {
  const payload = await authenticatedJsonFetch<{ recipe: GeneratedRecipe; usage?: AIUsageMetadata }>('/api/ai/recipe', {
    method: 'POST',
    body: JSON.stringify({ prompt, context }),
  });

  return payload;
}

export async function requestRecipeClarificationWithAI(
  prompt: string,
  context?: AIRecipeContextDraft,
): Promise<AIClarificationResult> {
  return authenticatedJsonFetch<AIClarificationResult>('/api/ai/recipe', {
    method: 'POST',
    body: JSON.stringify({ prompt, context, mode: 'clarify' }),
  });
}
