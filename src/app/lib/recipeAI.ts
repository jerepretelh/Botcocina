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
}

export interface AIClarificationResult {
  needsClarification: boolean;
  questions: AIClarificationQuestion[];
}

export async function generateRecipeWithAI(prompt: string): Promise<GeneratedRecipe> {
  const response = await fetch('/api/ai/recipe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // keep null payload and throw a fallback error below
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : 'No se pudo generar la receta con IA.';
    throw new Error(message);
  }

  return payload as GeneratedRecipe;
}

export async function requestRecipeClarificationWithAI(
  prompt: string,
): Promise<AIClarificationResult> {
  const response = await fetch('/api/ai/recipe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, mode: 'clarify' }),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // keep null payload and throw a fallback error below
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : 'No se pudo consultar preguntas previas con IA.';
    throw new Error(message);
  }

  return payload as AIClarificationResult;
}
