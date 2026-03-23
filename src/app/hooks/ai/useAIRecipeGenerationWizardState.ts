import { useCallback } from 'react';
import { type AIMockScenarioId, getAIMockScenario, getDefaultAIMockScenario } from '../../lib/aiMockScenarios';
import { normalizeText } from '../../utils/recipeHelpers';
import type { AIIngredientToken, AIRecipeContextDraft, RecipeSeed } from '../../types';
import { INITIAL_AI_CONTEXT_DRAFT } from '../../lib/ai-recipe-generation/clarification';
import type { AIClarificationsController } from './useAIRecipeGeneration.shared';

export function useAIRecipeGenerationWizardState(args: {
  ai: AIClarificationsController;
  setScreen: (screen: string) => void;
}) {
  const resetAiWizardState = useCallback((nextContextDraft?: AIRecipeContextDraft) => {
    args.ai.setAiPrompt(nextContextDraft?.prompt ?? '');
    args.ai.setAiContextDraft(nextContextDraft ?? INITIAL_AI_CONTEXT_DRAFT);
    args.ai.setSelectedRecipeSeed(null);
    args.ai.setAiWizardStep('context');
    args.ai.setAiRequestSource('real');
    args.ai.setAiMockScenarioId(null);
    args.ai.setAiPreRecipe(null);
    args.ai.setAiPreviewMessages([]);
    args.ai.setAiPreviewDraftMessage('');
    args.ai.setAiClarificationQuestions([]);
    args.ai.setAiClarificationAnswers({});
    args.ai.setAiClarificationNumberModes({});
    args.ai.setAiClarificationQuantityUnits({});
    args.ai.setAiClarificationSuggestedTitle(null);
    args.ai.setAiClarificationTip(null);
  }, [args.ai]);

  const applyMockScenarioToContext = useCallback((scenarioId?: AIMockScenarioId) => {
    const scenario = scenarioId ? getAIMockScenario(scenarioId) : getDefaultAIMockScenario();
    if (!scenario) return;
    const clonedContextDraft: AIRecipeContextDraft = {
      ...scenario.contextDraft,
      availableIngredients: scenario.contextDraft.availableIngredients.map((item) => ({ ...item })),
      avoidIngredients: scenario.contextDraft.avoidIngredients.map((item) => ({ ...item })),
    };
    args.ai.setSelectedRecipeSeed(null);
    args.ai.setAiContextDraft(clonedContextDraft);
    args.ai.setAiPrompt(clonedContextDraft.prompt);
    args.ai.setAiPreRecipe(null);
    args.ai.setAiPreviewMessages([]);
    args.ai.setAiPreviewDraftMessage('');
    args.ai.setAiError(null);
    args.ai.setAiSuccess('Ejemplo cargado en modo prueba. No consumirá créditos.');
    args.ai.setAiRequestSource('mock');
    args.ai.setAiMockScenarioId(scenario.id);
  }, [args.ai]);

  const jumpToMockPreview = useCallback((scenarioId?: AIMockScenarioId) => {
    const scenario = scenarioId ? getAIMockScenario(scenarioId) : getDefaultAIMockScenario();
    if (!scenario) return;
    applyMockScenarioToContext(scenario.id);
    args.ai.setAiRequestSource('mock');
    args.ai.setAiMockScenarioId(scenario.id);
    args.ai.setAiPreRecipe(scenario.preRecipe);
    args.ai.setAiPreviewMessages([
      {
        id: `assistant-${scenario.id}`,
        role: 'assistant',
        text: `Prereceta base lista para ${scenario.preRecipe.name}.`,
      },
    ]);
    args.ai.setAiWizardStep('preview');
    args.ai.setAiSuccess('Prereceta mock cargada. Puedes seguir ajustándola sin usar IA real.');
    args.setScreen('ai-clarify');
  }, [applyMockScenarioToContext, args]);

  const startWizardFromSeed = useCallback((seed: RecipeSeed) => {
    const nextContextDraft: AIRecipeContextDraft = {
      ...INITIAL_AI_CONTEXT_DRAFT,
      prompt: seed.name,
    };
    args.ai.setSelectedRecipeSeed(seed);
    args.ai.setAiPrompt(seed.name);
    args.ai.setAiContextDraft(nextContextDraft);
    args.ai.setAiWizardStep('context');
    args.ai.setAiRequestSource('real');
    args.ai.setAiMockScenarioId(null);
    args.ai.setAiPreRecipe(null);
    args.ai.setAiPreviewMessages([]);
    args.ai.setAiPreviewDraftMessage('');
    args.ai.setAiClarificationQuestions([]);
    args.ai.setAiClarificationAnswers({});
    args.ai.setAiClarificationNumberModes({});
    args.ai.setAiClarificationQuantityUnits({});
    args.ai.setAiClarificationSuggestedTitle(seed.name);
    args.ai.setAiClarificationTip(null);
    args.ai.setAiError(null);
    args.ai.setAiSuccess(null);
    args.setScreen('ai-clarify');
  }, [args]);

  const handleAiPromptChange = useCallback((value: string) => {
    args.ai.setAiPrompt(value);
    args.ai.setAiContextDraft((prev) => ({ ...prev, prompt: value }));
    if (args.ai.selectedRecipeSeed && normalizeText(value) !== normalizeText(args.ai.selectedRecipeSeed.name)) {
      args.ai.setSelectedRecipeSeed(null);
    }
    if (args.ai.aiWizardStep === 'preview') {
      args.ai.setAiPreRecipe(null);
      args.ai.setAiPreviewMessages([]);
      args.ai.setAiPreviewDraftMessage('');
      args.ai.setAiWizardStep('context');
    }
    args.ai.setAiRequestSource('real');
    args.ai.setAiMockScenarioId(null);
    args.ai.setAiSuccess(null);
    args.ai.setAiError(null);
  }, [args.ai]);

  const upsertContextIngredients = useCallback((field: 'availableIngredients' | 'avoidIngredients', nextValue: string) => {
    const trimmed = nextValue.trim();
    if (!trimmed) return;
    args.ai.setAiContextDraft((prev) => {
      const exists = prev[field].some((item) => normalizeText(item.value) === normalizeText(trimmed));
      if (exists) return prev;
      const nextToken: AIIngredientToken = {
        id: `${field}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        value: trimmed,
      };
      return {
        ...prev,
        [field]: [...prev[field], nextToken],
      };
    });
    args.ai.setAiError(null);
  }, [args.ai]);

  const removeContextIngredient = useCallback((field: 'availableIngredients' | 'avoidIngredients', tokenId: string) => {
    args.ai.setAiContextDraft((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item.id !== tokenId),
    }));
  }, [args.ai]);

  const handleAiWizardBack = useCallback(() => {
    if (args.ai.aiWizardStep === 'preview') {
      args.ai.setAiWizardStep('context');
      args.ai.setAiError(null);
      return;
    }
    args.ai.setAiError(null);
    args.ai.setAiSuccess(null);
    args.setScreen('category-select');
  }, [args.ai, args.setScreen]);

  return {
    resetAiWizardState,
    applyMockScenarioToContext,
    jumpToMockPreview,
    startWizardFromSeed,
    handleAiPromptChange,
    addAvailableIngredient: (value: string) => upsertContextIngredients('availableIngredients', value),
    addAvoidIngredient: (value: string) => upsertContextIngredients('avoidIngredients', value),
    removeAvailableIngredient: (tokenId: string) => removeContextIngredient('availableIngredients', tokenId),
    removeAvoidIngredient: (tokenId: string) => removeContextIngredient('avoidIngredients', tokenId),
    handleAiWizardBack,
  };
}
