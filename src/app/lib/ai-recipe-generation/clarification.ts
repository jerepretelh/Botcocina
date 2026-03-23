import type {
  AIRecipeContextDraft,
  ClarificationNumberMode,
  ClarificationQuantityUnit,
} from '../../../types';
import type { AIClarificationQuestion } from '../recipeAI';
import {
  inferClarificationNumberIntent,
  normalizeText,
} from '../../utils/recipeHelpers';
import { supportsIngredientBaseFromText } from '../recipeSetupBehavior';

export const INITIAL_AI_CONTEXT_DRAFT: AIRecipeContextDraft = {
  prompt: '',
  servings: null,
  availableIngredients: [],
  avoidIngredients: [],
};

export function resolveClarificationUnit(
  question: AIClarificationQuestion,
  numberModes: Record<string, ClarificationNumberMode>,
  quantityUnits: Record<string, ClarificationQuantityUnit>,
): string {
  if (question.type !== 'number') return '';
  if (inferClarificationNumberIntent(question) === 'servings') return 'personas';
  const mode = numberModes[question.id];
  if (mode === 'people') return 'personas';
  const selectedQuantityUnit = quantityUnits[question.id];
  if (selectedQuantityUnit === 'grams') return 'g';
  if (selectedQuantityUnit === 'units') return 'unidades';
  const normalizedQuestionUnit = normalizeText(question.unit ?? '');
  if (normalizedQuestionUnit.includes('g') || normalizedQuestionUnit.includes('gram')) return 'g';
  if (normalizedQuestionUnit.includes('persona')) return 'unidades';
  return question.unit || 'unidades';
}

function normalizeQuestionShape(
  question: AIClarificationQuestion,
  normalizedPrompt: string,
): AIClarificationQuestion {
  const text = normalizeText(`${question.id} ${question.question}`);

  if (question.type === 'text') {
    if (text.includes('tipo de papa') || text.includes('papa tienes') || text.includes('papa prefieres')) {
      return { ...question, type: 'single_choice', options: ['Canchán', 'Huayro', 'Yungay', 'Única', 'Blanca', 'Otra'] };
    }
    if (text.includes('tipo de camote') || text.includes('camote prefieres')) {
      return { ...question, type: 'single_choice', options: ['Camote amarillo', 'Camote morado', 'Camote blanco', 'Otro'] };
    }
    if (text.includes('tipo de pescado')) {
      return { ...question, type: 'single_choice', options: ['Perico', 'Lenguado', 'Tilapia', 'Merluza', 'Bonito', 'Otro'] };
    }
    if (text.includes('corte') || text.includes('como cortar') || text.includes('trozos') || text.includes('filete')) {
      return { ...question, type: 'single_choice', options: ['Filete', 'Trozos medianos', 'Tiras', 'Bastones', 'Rodajas', 'Otro corte'] };
    }
    if (
      text.includes('cuantas personas') ||
      text.includes('cuanta') ||
      text.includes('cantidad') ||
      text.includes('gramos') ||
      text.includes('kilos') ||
      text.includes('cuantos')
    ) {
      const isServingsQuestion =
        text.includes('persona') ||
        text.includes('personas') ||
        text.includes('comensal') ||
        text.includes('porcion') ||
        text.includes('porción');
      return {
        ...question,
        type: 'number',
        min: 1,
        max: isServingsQuestion ? 12 : (text.includes('gramos') || text.includes('kilos') ? 5000 : 20),
        step: text.includes('gramos') || text.includes('kilos') ? 50 : 1,
        unit: isServingsQuestion ? 'personas' : (text.includes('gramos') || text.includes('kilos') ? 'g' : 'unidades'),
        numberIntent: isServingsQuestion ? 'servings' : 'ingredient_base',
      };
    }
  }

  if (
    question.type === 'single_choice' &&
    (!Array.isArray(question.options) || question.options.length === 0)
  ) {
    if (normalizedPrompt.includes('papa') || normalizedPrompt.includes('camote')) {
      return { ...question, options: ['Blanca', 'Canchán', 'Huayro', 'Yungay', 'Otra'] };
    }
    if (normalizedPrompt.includes('pescado')) {
      return { ...question, options: ['Perico', 'Tilapia', 'Merluza', 'Bonito', 'Otro'] };
    }
  }

  return question;
}

export function enrichClarificationQuestions(
  userPrompt: string,
  questions: AIClarificationQuestion[],
  contextDraft: AIRecipeContextDraft,
): AIClarificationQuestion[] {
  const normalizedPrompt = normalizeText(userPrompt);
  const supportsIngredientBase = supportsIngredientBaseFromText(userPrompt);
  const result = questions
    .map((question) => normalizeQuestionShape(question, normalizedPrompt))
    .filter((question) => {
      if (question.type !== 'number') return true;
      return supportsIngredientBase || inferClarificationNumberIntent(question) === 'servings';
    });

  const hasCutQuestion = result.some((question) => {
    const text = normalizeText(`${question.id} ${question.question}`);
    return text.includes('corte') || text.includes('filete') || text.includes('trozo');
  });
  const isFishFry =
    normalizedPrompt.includes('pescado') &&
    (normalizedPrompt.includes('frito') || normalizedPrompt.includes('freir') || normalizedPrompt.includes('chicharron'));
  if (isFishFry && !hasCutQuestion) {
    result.push({
      id: 'tipo_corte_pescado',
      question: '¿Qué tipo de corte usarás?',
      type: 'single_choice',
      required: true,
      options: ['Filete', 'Trozos medianos', 'Entero abierto'],
    });
  }

  const hasNumericQuestion = result.some((question) => question.type === 'number');
  const hasIngredientBaseQuestion = result.some(
    (question) => question.type === 'number' && inferClarificationNumberIntent(question) === 'ingredient_base',
  );
  if (supportsIngredientBase && !contextDraft.servings && !hasNumericQuestion && !hasIngredientBaseQuestion) {
    result.push({
      id: 'cantidad_base',
      question: '¿Con qué base quieres cocinar esta receta?',
      type: 'number',
      required: true,
      min: 1,
      max: 5000,
      step: 50,
      unit: 'g',
      numberIntent: 'ingredient_base',
    });
  }

  return result;
}

