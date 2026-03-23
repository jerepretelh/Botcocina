/**
 * Hook que gestiona la generación de recetas con IA.
 * Mantiene la API pública estable, pero reparte wizard, clarificaciones
 * y handoff de runtime en módulos más pequeños.
 */
import { useCallback } from 'react';
import {
  requestRecipeClarificationWithAI,
  type AIClarificationQuestion,
  type AIClarificationResult,
} from '../../lib/recipeAI';
import {
  ClarificationNumberMode,
  ClarificationQuantityUnit,
} from '../../types';
import {
  inferPeopleCountFromClarifications,
  inferSizingFromClarifications,
  inferClarificationNumberIntent,
  normalizeText,
} from '../../utils/recipeHelpers';
import { useAIClarifications } from '../useAIClarifications';
import {
  findAIMockScenarioForPrompt,
  isAIMockModeEnabled,
} from '../../lib/aiMockScenarios';
import {
  enrichClarificationQuestions,
  resolveClarificationUnit,
} from '../../lib/ai-recipe-generation/clarification';
import {
  buildPromptWithContext,
  isQuestionSatisfiedByContext,
  type UseAIRecipeGenerationDeps,
} from './useAIRecipeGeneration.shared';
import { useAIRecipeGenerationWizardState } from './useAIRecipeGenerationWizardState';
import { useAIRecipeGenerationRuntimeHandoff } from './useAIRecipeGenerationRuntimeHandoff';

export function useAIRecipeGeneration(deps: UseAIRecipeGenerationDeps) {
  const ai = useAIClarifications();

  const buildPromptWithClarifications = useCallback((basePrompt: string): string => {
    if (ai.aiClarificationQuestions.length === 0) return basePrompt;
    const answeredLines = ai.aiClarificationQuestions
      .map((question) => {
        const value = ai.aiClarificationAnswers[question.id];
        if (value === undefined || value === null || value === '') return '';
        const unit = resolveClarificationUnit(question, ai.aiClarificationNumberModes, ai.aiClarificationQuantityUnits);
        const numberMode = ai.aiClarificationNumberModes[question.id];
        const label =
          question.type === 'number' &&
            inferClarificationNumberIntent(question) === 'ingredient_base' &&
            numberMode === 'quantity' &&
            normalizeText(question.question).includes('persona')
            ? 'Cantidad disponible'
            : question.question;
        return `- ${label}: ${value}${unit ? ` ${unit}` : ''}`;
      })
      .filter(Boolean);
    if (answeredLines.length === 0) return basePrompt;
    return [basePrompt, '', 'Datos adicionales confirmados por el usuario:', ...answeredLines, '- Genera la receta alineada a estos datos.'].join('\n');
  }, [ai.aiClarificationAnswers, ai.aiClarificationNumberModes, ai.aiClarificationQuantityUnits, ai.aiClarificationQuestions]);

  const buildFinalPrompt = useCallback(() => {
    const promptWithContext = buildPromptWithContext(ai.aiContextDraft);
    const promptBase = promptWithContext || ai.aiPrompt.trim();
    return buildPromptWithClarifications(promptBase);
  }, [ai.aiContextDraft, ai.aiPrompt, buildPromptWithClarifications]);

  const applyClarificationResult = useCallback((prompt: string, clarification: AIClarificationResult) => {
    const normalizedQuestions = Array.isArray(clarification.questions)
      ? clarification.questions
        .filter((question) => question && question.id && question.question && question.type)
        .slice(0, 5)
      : [];
    const enrichedQuestions = enrichClarificationQuestions(prompt, normalizedQuestions, ai.aiContextDraft)
      .filter((question) => !isQuestionSatisfiedByContext(question, ai.aiContextDraft));
    ai.setAiClarificationSuggestedTitle(clarification.suggestedTitle ?? null);
    ai.setAiClarificationTip(clarification.tip ?? null);

    if (clarification.needsClarification && enrichedQuestions.length > 0) {
      const initialAnswers: Record<string, string | number> = {};
      const initialNumberModes: Record<string, ClarificationNumberMode> = {};
      const initialQuantityUnits: Record<string, ClarificationQuantityUnit> = {};
      enrichedQuestions.forEach((question) => {
        if (question.type === 'single_choice' && Array.isArray(question.options) && question.options.length > 0) {
          initialAnswers[question.id] = '';
          return;
        }
        if (question.type === 'number') {
          initialAnswers[question.id] = typeof question.min === 'number' ? question.min : 1;
          const questionIntent = inferClarificationNumberIntent(question);
          initialNumberModes[question.id] = questionIntent === 'ingredient_base' ? 'quantity' : 'people';
          initialQuantityUnits[question.id] =
            normalizeText(question.unit ?? '').includes('g') || normalizeText(question.unit ?? '').includes('gram')
              ? 'grams'
              : 'units';
          return;
        }
        initialAnswers[question.id] = '';
      });
      ai.setAiClarificationQuestions(enrichedQuestions);
      ai.setAiClarificationAnswers(initialAnswers);
      ai.setAiClarificationNumberModes(initialNumberModes);
      ai.setAiClarificationQuantityUnits(initialQuantityUnits);
      ai.setAiWizardStep('refinement');
      deps.setScreen('ai-clarify');
      return true;
    }

    ai.setAiClarificationQuestions([]);
    ai.setAiClarificationAnswers({});
    ai.setAiClarificationNumberModes({});
    ai.setAiClarificationQuantityUnits({});
    return false;
  }, [ai, deps]);

  const wizard = useAIRecipeGenerationWizardState({
    ai,
    setScreen: deps.setScreen,
    applyClarificationResult,
  });

  const getMissingClarificationQuestion = useCallback(
    () =>
      ai.aiClarificationQuestions.find((question) => {
        if (!question.required) return false;
        const value = ai.aiClarificationAnswers[question.id];
        return value === undefined || value === null || value === '';
      }),
    [ai.aiClarificationAnswers, ai.aiClarificationQuestions],
  );

  const runtimeHandoff = useAIRecipeGenerationRuntimeHandoff({
    ai,
    deps,
    buildFinalPrompt,
    inferSizing: () => inferSizingFromClarifications(
      ai.aiClarificationQuestions,
      ai.aiClarificationAnswers,
      ai.aiClarificationNumberModes,
      ai.aiClarificationQuantityUnits,
    ),
    inferPeopleCount: () => inferPeopleCountFromClarifications(
      ai.aiClarificationQuestions,
      ai.aiClarificationAnswers,
      ai.aiClarificationNumberModes,
    ),
    resetAiWizardState: wizard.resetAiWizardState,
  });

  const handleAiContextContinue = useCallback(async () => {
    const prompt = ai.aiContextDraft.prompt.trim();
    if (!prompt) {
      ai.setAiError('Escribe una idea de receta antes de continuar.');
      return;
    }

    ai.setAiPrompt(prompt);
    ai.setAiError(null);
    ai.setAiSuccess(null);
    ai.setIsCheckingClarifications(true);

    try {
      const activeMockScenario = isAIMockModeEnabled() ? findAIMockScenarioForPrompt(prompt) : null;
      if (activeMockScenario) {
        ai.setAiRequestSource('mock');
        ai.setAiMockScenarioId(activeMockScenario.id);
        const movedToRefinement = applyClarificationResult(prompt, activeMockScenario.clarification);
        ai.setAiSuccess('Usando escenario de prueba. No se consumirán créditos de IA.');
        if (movedToRefinement) return;
        await runtimeHandoff.finalizeRecipeGeneration({
          overrideMockScenario: activeMockScenario,
          overrideRequestSource: 'mock',
        });
        return;
      }

      ai.setAiRequestSource('real');
      ai.setAiMockScenarioId(null);
      const clarification = await requestRecipeClarificationWithAI(prompt, ai.aiContextDraft);
      const movedToRefinement = applyClarificationResult(prompt, clarification);
      if (movedToRefinement) return;
      await runtimeHandoff.finalizeRecipeGeneration();
    } catch (error) {
      ai.setAiWizardStep('context');
      ai.setAiError(error instanceof Error ? error.message : 'No se pudo consultar a la IA.');
    } finally {
      ai.setIsCheckingClarifications(false);
    }
  }, [ai, applyClarificationResult, runtimeHandoff]);

  const handleGenerateRecipe = useCallback(async () => {
    if (ai.aiClarificationQuestions.length === 0) {
      await handleAiContextContinue();
      return;
    }

    const missingQuestion = getMissingClarificationQuestion();
    if (missingQuestion) {
      ai.setAiError(`Falta responder: ${missingQuestion.question}`);
      return;
    }

    await runtimeHandoff.finalizeRecipeGeneration();
  }, [ai.aiClarificationQuestions.length, ai, getMissingClarificationQuestion, handleAiContextContinue, runtimeHandoff]);

  return {
    aiPrompt: ai.aiPrompt,
    setAiPrompt: ai.setAiPrompt,
    aiContextDraft: ai.aiContextDraft,
    setAiContextDraft: ai.setAiContextDraft,
    selectedRecipeSeed: ai.selectedRecipeSeed,
    setSelectedRecipeSeed: ai.setSelectedRecipeSeed,
    aiWizardStep: ai.aiWizardStep,
    setAiWizardStep: ai.setAiWizardStep,
    aiClarificationQuestions: ai.aiClarificationQuestions,
    setAiClarificationQuestions: ai.setAiClarificationQuestions,
    aiClarificationAnswers: ai.aiClarificationAnswers,
    setAiClarificationAnswers: ai.setAiClarificationAnswers,
    aiClarificationNumberModes: ai.aiClarificationNumberModes,
    setAiClarificationNumberModes: ai.setAiClarificationNumberModes,
    aiClarificationQuantityUnits: ai.aiClarificationQuantityUnits,
    setAiClarificationQuantityUnits: ai.setAiClarificationQuantityUnits,
    aiClarificationSuggestedTitle: ai.aiClarificationSuggestedTitle,
    setAiClarificationSuggestedTitle: ai.setAiClarificationSuggestedTitle,
    aiClarificationTip: ai.aiClarificationTip,
    setAiClarificationTip: ai.setAiClarificationTip,
    aiError: ai.aiError,
    setAiError: ai.setAiError,
    aiSuccess: ai.aiSuccess,
    setAiSuccess: ai.setAiSuccess,
    isCheckingClarifications: ai.isCheckingClarifications,
    setIsCheckingClarifications: ai.setIsCheckingClarifications,
    isGeneratingRecipe: ai.isGeneratingRecipe,
    setIsGeneratingRecipe: ai.setIsGeneratingRecipe,
    handleGenerateRecipe,
    handleAiContextContinue,
    handleAiWizardBack: wizard.handleAiWizardBack,
    handleAiPromptChange: wizard.handleAiPromptChange,
    startWizardFromSeed: wizard.startWizardFromSeed,
    isAiMockModeEnabled: isAIMockModeEnabled(),
    aiRequestSource: ai.aiRequestSource,
    applyMockScenarioToContext: wizard.applyMockScenarioToContext,
    jumpToMockRefinement: wizard.jumpToMockRefinement,
    generateMockRecipeDirect: runtimeHandoff.generateMockRecipeDirect,
    addAvailableIngredient: wizard.addAvailableIngredient,
    addAvoidIngredient: wizard.addAvoidIngredient,
    removeAvailableIngredient: wizard.removeAvailableIngredient,
    removeAvoidIngredient: wizard.removeAvoidIngredient,
    resolveClarificationUnit: (question: AIClarificationQuestion) =>
      resolveClarificationUnit(question, ai.aiClarificationNumberModes, ai.aiClarificationQuantityUnits),
    getMissingClarificationQuestion,
  };
}
